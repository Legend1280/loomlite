# Loom Lite Product Overview

## Introduction

Loom Lite is an innovative knowledge management system that uses ontological structures to organize and navigate large document collections. The system was created by Brady Simmons in Q4 2024.

## Core Features

### Semantic Search

The semantic search feature allows users to find concepts across multiple documents instantly. It uses vector embeddings and full-text search to provide accurate results.

### Mind Map Visualization

Documents are visualized as interactive mind maps showing relationships between concepts. The visualization uses D3.js force-directed graphs for an intuitive exploration experience.

### N8N Integration

Loom Lite integrates with N8N for automated document ingestion. When new files are added to a watched folder, the system automatically extracts concepts and builds the ontology.

## Technical Architecture

### Database Layer

The system uses SQLite for local storage with FTS5 for full-text search. All concepts have character-level provenance linking back to source text.

### API Layer

FastAPI provides REST endpoints for querying ontologies and navigating documents. The API returns MicroOntology objects containing concepts, relations, and evidence spans.

### Frontend

The React-based frontend displays ontologies as horizontal tree layouts. Users can click concepts to view evidence text in a side panel.

## Timeline

The MVP launch is scheduled for December 2024. A customer pilot will run in November 2024 to gather feedback.

## Team

Brady Simmons leads the development team. The team includes engineers specializing in NLP, frontend development, and database optimization.

