"""
Helper functions for calculating document provenance status
"""

from .provenance import get_provenance_events

def get_provenance_status(db_path: str, doc_id: str) -> str:
    """
    Calculate provenance status for a document
    
    Returns:
        'verified' - Complete provenance chain (all required events)
        'partial' - Incomplete provenance (missing events)
        'none' - No provenance data
    """
    events = get_provenance_events(db_path, doc_id)
    
    if not events:
        return 'none'
    
    # Required events for verified status
    required_events = {'ingested', 'ontology_extracted', 'summaries_generated'}
    event_types = {event['event_type'] for event in events}
    
    if required_events.issubset(event_types):
        return 'verified'
    else:
        return 'partial'


def add_provenance_status(db_path: str, documents: list) -> list:
    """
    Add provenance_status field to a list of document dicts
    
    Args:
        db_path: Path to database
        documents: List of document dictionaries
        
    Returns:
        Same list with provenance_status added to each document
    """
    for doc in documents:
        doc['provenance_status'] = get_provenance_status(db_path, doc['id'])
    
    return documents

