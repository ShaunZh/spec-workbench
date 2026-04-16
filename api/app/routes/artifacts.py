"""Artifact CRUD routes."""

import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.artifact import Artifact
from app.schemas.artifact import ArtifactCreate
from app.schemas.analysis import ArtifactResponse

router = APIRouter(prefix="/artifacts", tags=["artifacts"])


@router.post("", response_model=ArtifactResponse)
def create_artifact(body: ArtifactCreate, db: Session = Depends(get_db)):
    """Create a new analysis result (artifact)."""
    artifact = Artifact(
        conversation_id=body.conversation_id,
        source_message_id=body.source_message_id,
        summary=body.summary,
        todos_json=json.dumps(body.todos),
        risks_json=json.dumps(body.risks),
        acceptance_json=json.dumps(body.acceptance_criteria),
        questions_json=json.dumps(body.open_questions),
    )
    db.add(artifact)
    db.commit()
    db.refresh(artifact)
    return artifact


@router.get("/conversations/{conversation_id}", response_model=List[ArtifactResponse])
def get_conversation_artifacts(conversation_id: int, db: Session = Depends(get_db)):
    """Get all analysis results for a conversation, ordered by creation time (newest first)."""
    artifacts = (
        db.query(Artifact)
        .filter(Artifact.conversation_id == conversation_id)
        .order_by(Artifact.created_at.desc())
        .all()
    )
    return artifacts
