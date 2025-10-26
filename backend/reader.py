"""
Document Reader - Extract text from various file formats
Supports: PDF, DOCX, Markdown, TXT
"""

import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import hashlib


def read_document(file_path: str) -> Dict:
    """
    Read document and extract text with metadata
    
    Returns:
        {
            "text": str,
            "mime": str,
            "checksum": str,
            "bytes": int,
            "pages": Optional[List[str]],  # For PDFs
            "sections": Optional[List[Dict]]  # For structured docs
        }
    """
    path = Path(file_path)
    
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Get file metadata
    file_bytes = path.stat().st_size
    checksum = compute_checksum(file_path)
    
    # Detect file type
    ext = path.suffix.lower()
    
    if ext == '.pdf':
        return read_pdf(file_path, checksum, file_bytes)
    elif ext in ['.docx', '.doc']:
        return read_docx(file_path, checksum, file_bytes)
    elif ext in ['.md', '.markdown']:
        return read_markdown(file_path, checksum, file_bytes)
    elif ext in ['.txt', '.text']:
        return read_text(file_path, checksum, file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def compute_checksum(file_path: str) -> str:
    """Compute SHA256 checksum of file"""
    sha256 = hashlib.sha256()
    with open(file_path, 'rb') as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return f"sha256:{sha256.hexdigest()}"


def read_pdf(file_path: str, checksum: str, file_bytes: int) -> Dict:
    """Extract text from PDF using pdfplumber or pypdf"""
    try:
        import pdfplumber
        
        text_parts = []
        pages = []
        
        with pdfplumber.open(file_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text() or ""
                pages.append(page_text)
                text_parts.append(f"[Page {page_num}]\n{page_text}\n")
        
        full_text = "\n".join(text_parts)
        
        return {
            "text": full_text,
            "mime": "application/pdf",
            "checksum": checksum,
            "bytes": file_bytes,
            "pages": pages,
            "page_count": len(pages)
        }
    
    except ImportError:
        # Fallback to pypdf if pdfplumber not available
        try:
            from pypdf import PdfReader
            
            reader = PdfReader(file_path)
            text_parts = []
            pages = []
            
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text() or ""
                pages.append(page_text)
                text_parts.append(f"[Page {page_num}]\n{page_text}\n")
            
            full_text = "\n".join(text_parts)
            
            return {
                "text": full_text,
                "mime": "application/pdf",
                "checksum": checksum,
                "bytes": file_bytes,
                "pages": pages,
                "page_count": len(pages)
            }
        
        except ImportError:
            raise ImportError("PDF reading requires 'pdfplumber' or 'pypdf'. Install with: pip install pdfplumber")


def read_docx(file_path: str, checksum: str, file_bytes: int) -> Dict:
    """Extract text from DOCX using python-docx"""
    try:
        from docx import Document
        
        doc = Document(file_path)
        
        # Extract paragraphs
        paragraphs = []
        sections = []
        current_section = None
        
        for para in doc.paragraphs:
            # CRITICAL: Don't strip() to preserve character offsets for span provenance
            text = para.text
            
            # Skip truly empty paragraphs (but keep whitespace-only for offset accuracy)
            if not text or text.isspace():
                continue
            
            # Detect list items (bullets or numbered)
            is_list_item = False
            list_marker = ''
            if text.lstrip().startswith(('• ', '- ', '* ', '○ ', '■ ')):
                is_list_item = True
                # Preserve bullet but normalize to Markdown style
                stripped = text.lstrip()
                list_marker = '- '
                text = list_marker + stripped[2:]  # Replace bullet with '- '
            elif text.lstrip()[:3].rstrip('.').isdigit():  # Numbered list (1., 2., etc.)
                is_list_item = True
                stripped = text.lstrip()
                num_part = stripped.split('.', 1)[0]
                rest = stripped.split('.', 1)[1] if '.' in stripped else stripped
                list_marker = f"{num_part}. "
                text = list_marker + rest.lstrip()
            
            # Detect headings as sections
            if para.style.name.startswith('Heading'):
                if current_section:
                    sections.append(current_section)
                
                # Extract heading level safely
                style_name = para.style.name
                try:
                    if style_name == 'Heading':
                        level = 1  # Default generic "Heading" to level 1
                    else:
                        level = int(style_name.replace('Heading ', ''))
                except (ValueError, AttributeError):
                    level = 1  # Fallback for any non-standard heading styles
                
                current_section = {
                    "title": text,
                    "level": level,
                    "content": []
                }
            else:
                # Preserve structure: add list items or regular paragraphs
                if is_list_item:
                    paragraphs.append(text)  # Keep list marker
                else:
                    paragraphs.append(text)  # Keep as-is
                
                if current_section:
                    current_section["content"].append(text)
        
        if current_section:
            sections.append(current_section)
        
        full_text = "\n\n".join(paragraphs)
        
        return {
            "text": full_text,
            "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "checksum": checksum,
            "bytes": file_bytes,
            "sections": sections
        }
    
    except ImportError:
        raise ImportError("DOCX reading requires 'python-docx'. Install with: pip install python-docx")


def read_markdown(file_path: str, checksum: str, file_bytes: int) -> Dict:
    """Extract text from Markdown file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        text = f.read()
    
    # Parse sections (simple heading detection)
    sections = []
    current_section = None
    lines = text.split('\n')
    
    for line in lines:
        if line.startswith('#'):
            if current_section:
                sections.append(current_section)
            
            # Count heading level
            level = len(line) - len(line.lstrip('#'))
            title = line.lstrip('#').strip()
            
            current_section = {
                "title": title,
                "level": level,
                "content": []
            }
        elif current_section and line.strip():
            current_section["content"].append(line)
    
    if current_section:
        sections.append(current_section)
    
    return {
        "text": text,
        "mime": "text/markdown",
        "checksum": checksum,
        "bytes": file_bytes,
        "sections": sections
    }


def read_text(file_path: str, checksum: str, file_bytes: int) -> Dict:
    """Extract text from plain text file"""
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
    
    return {
        "text": text,
        "mime": "text/plain",
        "checksum": checksum,
        "bytes": file_bytes
    }


def chunk_text(text: str, chunk_size: int = 1500, overlap: int = 200) -> List[Tuple[int, int, str]]:
    """
    Split text into overlapping chunks for LLM processing
    
    Returns:
        List of (start_offset, end_offset, chunk_text)
    """
    chunks = []
    start = 0
    text_len = len(text)
    
    while start < text_len:
        end = min(start + chunk_size, text_len)
        
        # Try to break at sentence boundary
        if end < text_len:
            # Look for sentence end within last 100 chars
            search_start = max(end - 100, start)
            sentence_end = text.rfind('. ', search_start, end)
            if sentence_end > start:
                end = sentence_end + 1
        
        chunk = text[start:end]
        chunks.append((start, end, chunk))
        
        # Move start forward with overlap
        start = end - overlap if end < text_len else text_len
    
    return chunks


if __name__ == "__main__":
    # Test the reader
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python reader.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        result = read_document(file_path)
        print(f"✅ Successfully read: {file_path}")
        print(f"   MIME: {result['mime']}")
        print(f"   Size: {result['bytes']:,} bytes")
        print(f"   Checksum: {result['checksum'][:40]}...")
        print(f"   Text length: {len(result['text']):,} characters")
        
        if 'pages' in result:
            print(f"   Pages: {result['page_count']}")
        
        if 'sections' in result:
            print(f"   Sections: {len(result['sections'])}")
            for i, section in enumerate(result['sections'][:3], 1):
                print(f"      {i}. {section['title']}")
        
        print(f"\n   First 200 chars:")
        print(f"   {result['text'][:200]}...")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

