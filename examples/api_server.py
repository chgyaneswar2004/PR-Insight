import asyncio
import os
import re
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from github import Github

from codedog.retrievers.github_retriever import GithubRetriever
from codedog.chains.pr_summary.base import PRSummaryChain
from codedog.chains.code_review.base import CodeReviewChain
from codedog.actors.reporters.code_review import CodeReviewMarkdownReporter
from codedog.actors.reporters.pull_request import PullRequestReporter
from codedog.utils.langchain_utils import load_model_by_name
from codedog.config.settings import settings
from codedog.utils.email_utils import send_report_email
from langchain_community.callbacks.manager import get_openai_callback
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

# Config logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

from typing import Optional, Dict

class ReviewRequest(BaseModel):
    repo: str
    pr_number: int
    credentials: Optional[Dict[str, str]] = None

def extract_issues(code_reviews):
    security_issues = []
    quality_issues = []
    performance_issues = []
    doc_suggestions = []
    
    for idx, cr in enumerate(code_reviews):
        file_path = cr.file.full_name if hasattr(cr, 'file') and hasattr(cr.file, 'full_name') else "Unknown"
        lines = cr.review.split('\n') if hasattr(cr, 'review') else []
        
        # Scan code review text for issue recommendations
        for line in lines:
            line_strip = line.strip()
            # Look for lines starting with list markers
            if not (line_strip.startswith(('-', '*', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.'))):
                continue
                
            line_lower = line_strip.lower()
            content = line_strip.lstrip('-*0123456789. ')
            if not content:
                continue
                
            issue_item = {
                "id": f"issue-{idx}-{len(security_issues)+len(quality_issues)+len(performance_issues)+len(doc_suggestions)}",
                "title": content[:80] + "..." if len(content) > 80 else content,
                "description": content,
                "file": file_path,
                "line": 1,
                "severity": "medium"
            }
            
            if "security" in line_lower or "vulnerab" in line_lower or "auth" in line_lower or "crypt" in line_lower or "secret" in line_lower:
                issue_item["severity"] = "critical" if "critical" in line_lower else "high" if "high" in line_lower else "medium"
                issue_item["suggestion"] = "Ensure input sanitization, token verification, or encryption is applied."
                security_issues.append(issue_item)
            elif "performance" in line_lower or "efficient" in line_lower or "slow" in line_lower or "cache" in line_lower or "memory" in line_lower:
                issue_item["severity"] = "high" if "high" in line_lower else "medium"
                issue_item["suggestion"] = "Optimize algorithm or cache frequent database/API calls."
                performance_issues.append(issue_item)
            elif "bug" in line_lower or "error" in line_lower or "fail" in line_lower or "exception" in line_lower or "race" in line_lower:
                issue_item["type"] = "bug"
                issue_item["severity"] = "high"
                issue_item["suggestion"] = "Fix the boundary check, handle exceptions explicitly, or guard concurrent accesses."
                quality_issues.append(issue_item)
            elif "documentation" in line_lower or "comments" in line_lower or "docstring" in line_lower:
                issue_item["suggestion"] = "Add comments or update docstrings for the function."
                doc_suggestions.append(issue_item)
                
    return security_issues, quality_issues, performance_issues, doc_suggestions

def extract_diff_data(code_reviews):
    for cr in code_reviews:
        if hasattr(cr, 'file') and hasattr(cr.file, 'diff_content') and cr.file.diff_content:
            diff_text = cr.file.diff_content.content
            if not diff_text:
                continue
                
            old_lines = []
            new_lines = []
            
            for line in diff_text.split('\n'):
                if line.startswith('@@') or line.startswith('diff ') or line.startswith('index ') or line.startswith('---') or line.startswith('+++'):
                    continue
                if line.startswith('-'):
                    old_lines.append(line[1:])
                elif line.startswith('+'):
                    new_lines.append(line[1:])
                else:
                    content = line[1:] if line.startswith(' ') else line
                    old_lines.append(content)
                    new_lines.append(content)
            
            return {
                "oldCode": '\n'.join(old_lines),
                "newCode": '\n'.join(new_lines)
            }
    return None

def get_llm_clients(credentials: dict):
    tier = credentials.get("LLM_TIER") or os.environ.get("LLM_TIER", "free")
    
    # Check if THROTTLE_ENABLED is in credentials, else environment
    throttle_val = credentials.get("THROTTLE_ENABLED")
    if throttle_val is None:
        throttle_val = os.environ.get("THROTTLE_ENABLED", "true")
    throttle = throttle_val == "true"

    if tier == "free":
        gemini_key = credentials.get("GEMINI_API_KEY") or os.environ.get("GEMINI_API_KEY")
        nvidia_key = credentials.get("NVIDIA_API_KEY") or os.environ.get("NVIDIA_API_KEY")
        
        # Gemini for summaries — lightweight, high volume
        summary_llm = ChatGoogleGenerativeAI(
            model=credentials.get("CODE_SUMMARY_MODEL") or os.environ.get("CODE_SUMMARY_MODEL", "gemini-2.0-flash-lite"),
            google_api_key=gemini_key,
            temperature=0
        )

        # NVIDIA NIM for code review — heavy, low volume
        review_llm = ChatOpenAI(
            model=credentials.get("CODE_REVIEW_MODEL") or os.environ.get("CODE_REVIEW_MODEL", "meta/llama-3.1-70b-instruct"),
            openai_api_key=nvidia_key,
            openai_api_base="https://integrate.api.nvidia.com/v1",
            temperature=0,
            max_retries=10
        )

        return summary_llm, review_llm, throttle

    else:  # paid tier — single provider for everything
        api_key = credentials.get("OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
        api_base = credentials.get("OPENAI_API_BASE") or os.environ.get("OPENAI_API_BASE")
        model = credentials.get("CODE_REVIEW_MODEL") or os.environ.get("CODE_REVIEW_MODEL")
        
        if api_base and "deepseek" in api_base:
            from codedog.utils.langchain_utils import DeepSeekChatModel
            single_llm = DeepSeekChatModel(
                api_key=api_key,
                model_name=model,
                api_base=api_base,
                temperature=0.0,
                max_tokens=4096,
                top_p=0.95
            )
        else:
            single_llm = ChatOpenAI(
                model=model,
                openai_api_key=api_key,
                openai_api_base=api_base,
                temperature=0
            )
        return single_llm, single_llm, False  # same LLM, no throttle


@app.post("/review")
async def review_pr(request: ReviewRequest):
    credentials = request.credentials or {}
    github_token = credentials.get("GITHUB_TOKEN") or settings.github_token
    if not github_token:
        raise HTTPException(status_code=500, detail="GITHUB_TOKEN variable is not configured.")

    logger.info(f"Received review request for repository: {request.repo}, PR: #{request.pr_number}")
    
    try:
        client = Github(github_token)
        retriever = GithubRetriever(
            client=client,
            repository_name_or_id=request.repo,
            pull_request_number=request.pr_number,
        )
        
        pull_request = retriever.pull_request
        
        # Get LLM clients and throttle configuration based on user tier credentials
        summary_llm, review_llm, throttle = get_llm_clients(credentials)
        
        summary_chain = PRSummaryChain.from_llm(
            code_summary_llm=summary_llm,
            pr_summary_llm=summary_llm,
            verbose=True
        )
        review_chain = CodeReviewChain.from_llm(
            llm=review_llm,
            verbose=True
        )

        # Set or remove the throttle environment variable
        if throttle:
            os.environ["CODEDOG_THROTTLE"] = "true"
        else:
            os.environ.pop("CODEDOG_THROTTLE", None)
        
        with get_openai_callback() as cb:
            summary_result = await summary_chain.ainvoke({"pull_request": pull_request})
            review_result = await review_chain.ainvoke({"pull_request": pull_request})
            
            reporter = CodeReviewMarkdownReporter(review_result["code_reviews"])
            raw_markdown = reporter.report()
            
            avg_scores = reporter._calculate_average_scores()
            
            security_score = avg_scores.get("avg_security", 0.0) * 10
            quality_score = avg_scores.get("avg_code_style", 0.0) * 10
            performance_score = avg_scores.get("avg_efficiency", 0.0) * 10
            maintainability_score = avg_scores.get("avg_structure", 0.0) * 10
            readability_score = avg_scores.get("avg_readability", 0.0) * 10
            docs_score = avg_scores.get("avg_documentation", 0.0) * 10
            overall_score = avg_scores.get("avg_overall", 0.0) * 10
            
            sec_issues, qual_issues, perf_issues, doc_suggs = extract_issues(review_result["code_reviews"])
            diff_data = extract_diff_data(review_result["code_reviews"])
            
            # Form author structure
            author = {
                "login": "unknown",
                "avatar": None
            }
            raw_pr = getattr(pull_request, "raw", None)
            if raw_pr:
                # GitHub GHPullRequest
                if hasattr(raw_pr, "user") and raw_pr.user:
                    author["login"] = getattr(raw_pr.user, "login", "unknown")
                    author["avatar"] = getattr(raw_pr.user, "avatar_url", None)
                # GitLab ProjectMergeRequest
                elif hasattr(raw_pr, "author") and raw_pr.author:
                    author_obj = raw_pr.author
                    if isinstance(author_obj, dict):
                        author["login"] = author_obj.get("username") or author_obj.get("name") or "unknown"
                        author["avatar"] = author_obj.get("avatar_url")
                    else:
                        author["login"] = getattr(author_obj, "username", getattr(author_obj, "name", "unknown"))
                        author["avatar"] = getattr(author_obj, "avatar_url", None)
            
            # Files changed metrics
            files_changed = len(pull_request.change_files) if pull_request.change_files else 0
            additions = sum(cf.diff_content.add_count for cf in pull_request.change_files if cf.diff_content) if pull_request.change_files else 0
            deletions = sum(cf.diff_content.remove_count for cf in pull_request.change_files if cf.diff_content) if pull_request.change_files else 0

            # Send email report if configured
            email_enabled = credentials.get("EMAIL_ENABLED") == "true" if "EMAIL_ENABLED" in credentials else settings.email_enabled
            notification_emails = credentials.get("NOTIFICATION_EMAILS") or settings.notification_emails
            
            if email_enabled and notification_emails:
                email_addresses = [email.strip() for email in notification_emails.split(",") if email.strip()]
                if email_addresses:
                    logger.info(f"Sending PR review report email to {', '.join(email_addresses)}")
                    subject = f"[CodeDog Review] PR #{request.pr_number} Review: {pull_request.title}"
                    try:
                        await asyncio.to_thread(
                            send_report_email,
                            to_emails=email_addresses,
                            subject=subject,
                            markdown_content=raw_markdown,
                            credentials=credentials
                        )
                        logger.info("PR review report email sent successfully.")
                    except Exception as e:
                        logger.error(f"Failed to send PR review report email: {e}")

            return {
                "repo_full_name": request.repo,
                "pr_number": request.pr_number,
                "title": pull_request.title,
                "author": author,
                "summary": summary_result["pr_summary"].overview if "pr_summary" in summary_result and hasattr(summary_result["pr_summary"], 'overview') else "",
                "files_changed": files_changed,
                "additions": additions,
                "deletions": deletions,
                "overall_score": overall_score,
                "security_score": security_score,
                "quality_score": quality_score,
                "performance_score": performance_score,
                "maintainability_score": maintainability_score,
                "readability_score": readability_score,
                "docs_score": docs_score,
                "security_issues": sec_issues,
                "quality_issues": qual_issues,
                "performance_issues": perf_issues,
                "doc_suggestions": doc_suggs,
                "diff_data": diff_data,
                "raw_markdown": raw_markdown
            }
            
    except Exception as e:
        logger.error(f"Error handling code review: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("examples.api_server:app", host="127.0.0.1", port=8000, reload=True)
