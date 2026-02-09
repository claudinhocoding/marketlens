"""ChromaDB vector store for semantic search across intelligence data."""

import json
from typing import Any
import chromadb
from chromadb.config import Settings as ChromaSettings
from config import settings


class VectorStore:
    """Manages ChromaDB collections for MarketLens data."""

    def __init__(self):
        self.client = chromadb.PersistentClient(
            path=str(settings.chroma_dir),
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.collection = self.client.get_or_create_collection(
            name="marketlens",
            metadata={"hnsw:space": "cosine"},
        )

    def upsert_company_data(self, company_id: int, company_name: str, data: dict[str, Any]):
        """Index all intelligence data for a company."""
        documents = []
        metadatas = []
        ids = []

        # Index each data section
        for section, content in data.items():
            if isinstance(content, (list, dict)):
                text = json.dumps(content, indent=2)
            else:
                text = str(content)

            if not text.strip():
                continue

            doc_id = f"company-{company_id}-{section}"
            documents.append(f"Company: {company_name}\nSection: {section}\n\n{text}")
            metadatas.append({
                "company_id": company_id,
                "company_name": company_name,
                "section": section,
            })
            ids.append(doc_id)

        if documents:
            self.collection.upsert(documents=documents, metadatas=metadatas, ids=ids)

    def upsert_page(self, company_id: int, company_name: str, page_id: int, title: str, content: str, page_type: str):
        """Index a scraped page."""
        if not content.strip():
            return
        doc_id = f"page-{page_id}"
        self.collection.upsert(
            documents=[f"Company: {company_name}\nPage: {title}\nType: {page_type}\n\n{content[:8000]}"],
            metadatas=[{
                "company_id": company_id,
                "company_name": company_name,
                "page_type": page_type,
                "source": "scraped_page",
            }],
            ids=[doc_id],
        )

    def search(self, query: str, n_results: int = 10, company_id: int | None = None) -> list[dict]:
        """Semantic search across all indexed data."""
        where = {"company_id": company_id} if company_id else None
        results = self.collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where,
        )
        output = []
        for i, doc in enumerate(results["documents"][0]):
            meta = results["metadatas"][0][i] if results["metadatas"] else {}
            dist = results["distances"][0][i] if results["distances"] else 0
            output.append({"document": doc, "metadata": meta, "distance": dist})
        return output

    def delete_company(self, company_id: int):
        """Remove all data for a company."""
        try:
            self.collection.delete(where={"company_id": company_id})
        except Exception:
            pass


vector_store = VectorStore()
