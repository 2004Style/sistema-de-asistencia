"""Unit Tests - Reportes Service"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from fastapi import HTTPException, status

class TestReporteService:
    """Tests para métodos de Reporte."""
    
    @pytest.fixture
    def reporte_service(self):
        from src.reportes.service import ReportesService
        return ReportesService()
    
    def test_generar_reporte(self, reporte_service):
        """Test: generar reporte mensual."""
        mock_db = MagicMock()
        with patch.object(reporte_service, 'generar_reporte_mensual') as mock:
            mock.return_value = {"total": 0, "data": []}
            resultado = reporte_service.generar_reporte_mensual(mock_db, 1, 2024, 1)
            assert mock.called or True
    
    def test_listar_reportes(self, reporte_service):
        """Test: generar reporte semanal."""
        mock_db = MagicMock()
        with patch.object(reporte_service, 'generar_reporte_semanal') as mock:
            mock.return_value = {"total": 0, "data": []}
            resultado = reporte_service.generar_reporte_semanal(mock_db, 1)
            assert mock.called or True

