@echo off
REM ===== SCRIPT DE DEPLOY AUTOMÁTICO - RENDER (WINDOWS) =====
REM Script para facilitar o deploy de projetos no Render

echo.
echo 🚀 ===== DEPLOY AUTOMÁTICO - RENDER =====
echo.

REM Verificar se está em um repositório Git
if not exist ".git" (
    echo ❌ Erro: Este não é um repositório Git!
    echo Execute 'git init' primeiro.
    pause
    exit /b 1
)

REM Verificar se package.json existe
if not exist "package.json" (
    echo ❌ Erro: package.json não encontrado!
    echo Crie um package.json antes de fazer deploy.
    pause
    exit /b 1
)

REM Verificar se server.js existe
if not exist "server.js" (
    echo ❌ Erro: server.js não encontrado!
    echo Crie um server.js antes de fazer deploy.
    pause
    exit /b 1
)

REM Verificar se há mudanças não commitadas
git status --porcelain > temp_status.txt
if not %errorlevel%==0 (
    echo ❌ Erro ao verificar status do Git!
    del temp_status.txt
    pause
    exit /b 1
)

for /f %%i in ('find /c /v "" ^< temp_status.txt') do set changes=%%i
del temp_status.txt

if %changes% gtr 0 (
    echo ⚠️ Há mudanças não commitadas:
    git status --short
    echo.
    set /p commit_choice="Deseja fazer commit das mudanças? (y/N): "
    if /i "%commit_choice%"=="y" (
        set /p commit_message="Digite a mensagem do commit: "
        if "%commit_message%"=="" (
            set commit_message=Deploy automático - %date% %time%
        )
        git add .
        git commit -m "%commit_message%"
        echo ✅ Commit realizado: %commit_message%
    ) else (
        echo ❌ Deploy cancelado. Faça commit das mudanças primeiro.
        pause
        exit /b 1
    )
)

REM Mostrar informações do projeto
echo.
echo 📋 Informações do Projeto:
for /f "tokens=*" %%i in ('git branch --show-current') do set current_branch=%%i
echo    Branch: %current_branch%
for /f "tokens=*" %%i in ('git log -1 --pretty=format:"%%h - %%s (%%cr)"') do echo    Último commit: %%i
echo.

REM Verificar se há remote configurado
git remote -v > temp_remote.txt 2>nul
if not %errorlevel%==0 (
    echo ⚠️ Aviso: Nenhum remote configurado!
    echo Configure um remote GitHub antes de fazer deploy.
    set /p github_url="Digite a URL do repositório GitHub: "
    if not "%github_url%"=="" (
        git remote add origin "%github_url%"
        echo ✅ Remote configurado: %github_url%
    ) else (
        echo ❌ Deploy cancelado. Configure um remote primeiro.
        del temp_remote.txt
        pause
        exit /b 1
    )
) else (
    echo 🔗 Remote configurado:
    type temp_remote.txt
)
del temp_remote.txt 2>nul

echo.

REM Fazer push para o repositório
echo 📤 Fazendo push para o repositório...
git push origin %current_branch%
if %errorlevel%==0 (
    echo ✅ Push realizado com sucesso!
) else (
    echo ❌ Erro ao fazer push!
    echo Verifique se o repositório existe e se você tem permissão.
    pause
    exit /b 1
)

echo.
echo 🎉 Deploy iniciado com sucesso!
echo.
echo 📋 Próximos passos:
echo    1. Acesse https://render.com
echo    2. Vá em 'Dashboard' ^> 'New +' ^> 'Web Service'
echo    3. Conecte seu repositório GitHub
echo    4. Configure:
echo       - Name: seu-projeto-render
echo       - Runtime: Node
echo       - Build Command: npm install
echo       - Start Command: npm start
echo    5. Configure as variáveis de ambiente
echo    6. Clique em 'Create Web Service'
echo.
echo 🌐 Após o deploy, sua URL será:
echo    https://seu-projeto-render.onrender.com
echo.
echo 💡 Dica: O Render fará deploy automático a cada push!
echo.
echo 🚀 ===== DEPLOY CONCLUÍDO =====
echo.
pause
