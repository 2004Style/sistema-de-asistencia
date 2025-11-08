"""
Database migrations module.
Handles Alembic migrations programmatically.
"""
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def run_migrations_upgrade_head() -> bool:
    """
    Run Alembic migrations to upgrade to the latest revision (head).
    
    Returns:
        bool: True if successful, False if failed.
    
    Raises:
        Exception: If Alembic operations fail critically.
    """
    try:
        # Import here (lazy) to avoid import errors if alembic is not available
        from alembic.config import Config
        from alembic import command
        
        # Get the path to alembic.ini (should be in project root)
        alembic_ini_path = Path(__file__).parent.parent.parent / "alembic.ini"
        
        if not alembic_ini_path.exists():
            logger.warning(f"alembic.ini not found at {alembic_ini_path}. Skipping migrations.")
            return False
        
        cfg = Config(str(alembic_ini_path))
        
        # Ensure DATABASE_URL is set from settings
        from src.config.settings import get_settings
        settings = get_settings()
        cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        
        logger.info("Running Alembic migrations...")
        command.upgrade(cfg, "head")
        logger.info("✓ Migrations completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"✗ Error running migrations: {e}")
        raise


def run_migrations_downgrade(target: str = "-1") -> bool:
    """
    Downgrade migrations to a specific target or by N revisions.
    
    Args:
        target: Migration target (e.g., '-1' for one revision back, '12345abc' for specific revision)
    
    Returns:
        bool: True if successful, False if failed.
    """
    try:
        from alembic.config import Config
        from alembic import command
        
        alembic_ini_path = Path(__file__).parent.parent.parent / "alembic.ini"
        
        if not alembic_ini_path.exists():
            logger.warning(f"alembic.ini not found at {alembic_ini_path}.")
            return False
        
        cfg = Config(str(alembic_ini_path))
        
        from src.config.settings import get_settings
        settings = get_settings()
        cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        
        logger.info(f"Downgrading migrations to: {target}")
        command.downgrade(cfg, target)
        logger.info("✓ Downgrade completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"✗ Error downgrading migrations: {e}")
        raise


def get_migrations_status() -> dict:
    """
    Get the current migration status.
    
    Returns:
        dict: Migration status information.
    """
    try:
        from alembic.config import Config
        
        alembic_ini_path = Path(__file__).parent.parent.parent / "alembic.ini"
        
        if not alembic_ini_path.exists():
            return {"status": "error", "message": "alembic.ini not found"}
        
        cfg = Config(str(alembic_ini_path))
        
        from src.config.settings import get_settings
        settings = get_settings()
        cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
        
        logger.info("Checking migration status...")
        # Note: command.current and command.heads return information,
        # but for simplicity we just return a status message
        return {"status": "ok", "message": "Use 'alembic current' to see current revision"}
        
    except Exception as e:
        logger.error(f"✗ Error checking migration status: {e}")
        return {"status": "error", "message": str(e)}
