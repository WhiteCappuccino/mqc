from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["service"] == "analyzer"


def test_analyze_manual_review():
    response = client.post(
        "/analyze",
        json={
            "mediaType": "IMAGE",
            "title": "Banner",
            "description": "short",
            "mimeType": "image/png",
            "sizeBytes": 2_048,
            "fileName": "banner.png",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["recommendation"] in ["manual_review", "reject"]
    assert "missing_metadata_description" in body["violations"]
