"""
AI Chat Server for Planning Tool
Uses Ollama for local LLM inference
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import requests
import json

app = FastAPI(
    title="Planning Tool AI Server",
    description="AI Chat Server with Ollama Integration",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    model: str = "llama3.1"  # Using available model
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    success: bool
    response: str
    error: Optional[str] = None

@app.get("/")
def read_root():
    return {
        "service": "Planning Tool AI Server",
        "version": "1.0.0",
        "status": "running",
        "model": "Ollama LLM"
    }

@app.get("/health")
def health_check():
    try:
        # Check if Ollama is running
        response = requests.get("http://localhost:11434/api/tags", timeout=2)
        if response.status_code == 200:
            return {"status": "healthy", "ollama": "connected"}
        else:
            return {"status": "degraded", "ollama": "error"}
    except Exception as e:
        return {"status": "degraded", "ollama": "disconnected", "error": str(e)}

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat endpoint that uses Ollama for AI inference
    """
    try:
        # Build context-aware prompt
        prompt = build_prompt(request.message, request.context)

        # Call Ollama API
        ollama_response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": request.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,  # Lower temperature for more accurate responses
                    "top_p": 0.9,
                    "top_k": 40,
                    "repeat_penalty": 1.1,
                }
            },
            timeout=30
        )

        if ollama_response.status_code != 200:
            raise HTTPException(
                status_code=ollama_response.status_code,
                detail=f"Ollama API error: {ollama_response.text}"
            )

        result = ollama_response.json()
        ai_response = result.get("response", "").strip()

        return ChatResponse(
            success=True,
            response=ai_response
        )

    except requests.exceptions.ConnectionError:
        return ChatResponse(
            success=False,
            response="",
            error="Cannot connect to Ollama. Please make sure Ollama is running (ollama serve)"
        )
    except requests.exceptions.Timeout:
        return ChatResponse(
            success=False,
            response="",
            error="Ollama request timeout. The model might be too slow or overloaded."
        )
    except Exception as e:
        return ChatResponse(
            success=False,
            response="",
            error=f"Unexpected error: {str(e)}"
        )

def build_prompt(user_message: str, context: Optional[Dict[str, Any]] = None) -> str:
    """
    Build a context-aware prompt for the AI
    """
    system_prompt = """You are a helpful AI assistant for Thai users. Answer questions naturally and concisely.

Guidelines:
- For Thai-to-English translations: Answer in Thai like "สีเหลืองในภาษาอังกฤษคือ Yellow" (natural Thai sentence)
- For English-to-Thai translations: Answer in Thai like "Yellow ในภาษาไทยคือ สีเหลือง"
- For general questions: Answer directly and simply
- For counting/numbers: Just list them clearly without extra explanation
- For project management: Analyze the task data provided
- Use simple, natural language - avoid overly formal or technical terms
- Don't use English words mixed with Thai unless natural (avoid "translates to")
- Don't use markdown formatting (**, ##) in responses

"""

    # Add task context if available
    if context and "tasks" in context:
        tasks = context["tasks"]
        if isinstance(tasks, list) and len(tasks) > 0:
            task_summary = f"\nCurrent Project Context:\n"
            task_summary += f"- Total tasks: {len(tasks)}\n"

            # Count by status
            status_counts = {}
            for task in tasks:
                status = task.get("status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1

            for status, count in status_counts.items():
                task_summary += f"- {status}: {count} tasks\n"

            # Count by priority
            priority_counts = {}
            for task in tasks:
                priority = task.get("priority", "unknown")
                if priority:
                    priority_counts[priority] = priority_counts.get(priority, 0) + 1

            if priority_counts:
                task_summary += f"\nBy Priority:\n"
                for priority, count in priority_counts.items():
                    task_summary += f"- {priority}: {count} tasks\n"

            system_prompt += task_summary

    # Combine system prompt with user message
    full_prompt = f"{system_prompt}\n\nUser: {user_message}\n\nAssistant:"

    return full_prompt

if __name__ == "__main__":
    import uvicorn
    print("🤖 Starting AI Chat Server on port 8001...")
    print("📝 Make sure Ollama is running: ollama serve")
    print("📦 Required model: llama3.1 (ollama pull llama3.1)")
    uvicorn.run(app, host="0.0.0.0", port=8001)
