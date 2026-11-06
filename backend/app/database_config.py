def normalize_database_url(url: str) -> str:
    """Use the installed psycopg 3 driver with provider PostgreSQL URLs."""
    for prefix in ('postgres://', 'postgresql://'):
        if url.startswith(prefix):
            return 'postgresql+psycopg://' + url[len(prefix):]
    return url
