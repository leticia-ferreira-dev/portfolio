@echo off
chcp 65001 >nul
cd /d "%~dp0"
python servidor.py || py servidor.py || (echo Python nao encontrado. Instale em python.org e marque "Add to PATH". & pause)
