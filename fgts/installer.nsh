; Script personalizado para o instalador NSIS

; Criar atalho na área de trabalho
CreateShortCut "$DESKTOP\Sistema FGTS.lnk" "$INSTDIR\Sistema FGTS.exe" "" "$INSTDIR\assets\icon.ico"

; Criar pasta de dados do usuário
CreateDirectory "$APPDATA\Sistema FGTS"
CreateDirectory "$APPDATA\Sistema FGTS\logs"
CreateDirectory "$APPDATA\Sistema FGTS\cache"
CreateDirectory "$APPDATA\Sistema FGTS\config"

; Copiar arquivos de configuração se não existirem
IfFileExists "$APPDATA\Sistema FGTS\config\.env" +3 0
  CopyFiles "$INSTDIR\.env.example" "$APPDATA\Sistema FGTS\config\.env"

; Mensagem de instalação concluída
MessageBox MB_OK "Sistema FGTS instalado com sucesso!$\n$\nO aplicativo foi instalado e um atalho foi criado na área de trabalho.$\n$\nConfigure suas credenciais antes de usar o sistema."



