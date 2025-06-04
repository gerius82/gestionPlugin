@echo off
cd "C:\Users\giusto\OneDrive - Express Telecomunicaciones\00 - PC Personal\PLUGIN\Diseño\Pagina WEB"
git add .
git commit -m "Actualización automática %date% %time%"
git pull origin main --rebase
git push origin main
