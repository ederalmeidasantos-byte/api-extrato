import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let serverProcess;

// Configuração do servidor
const SERVER_PORT = 3005; // Mudado para porta livre
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

function createWindow() {
  // Criar a janela principal
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Aguardar servidor estar pronto antes de carregar
  const checkServerAndLoad = async () => {
    let tentativas = 0;
    const maxTentativas = 10;
    
    const tryLoad = async () => {
      try {
        console.log(`🔍 Tentativa ${tentativas + 1}/${maxTentativas} - Testando conexão...`);
        const response = await fetch(`${SERVER_URL}/fgts/status`, {
          method: 'GET',
          timeout: 3000
        });
        
        if (response.ok) {
          console.log('✅ Servidor respondendo! Carregando interface...');
          mainWindow.loadURL(`${SERVER_URL}/fgts`);
          return;
        } else {
          throw new Error(`Servidor respondeu com status: ${response.status}`);
        }
      } catch (error) {
        tentativas++;
        console.log(`⏳ Aguardando servidor... (${tentativas}/${maxTentativas})`);
        
        if (tentativas >= maxTentativas) {
          console.log('⚠️ Timeout - Carregando página de erro...');
          mainWindow.loadURL(`data:text/html,
            <html>
              <head><title>Sistema FGTS - Erro de Conexão</title></head>
              <body style="font-family: Arial; padding: 50px; text-align: center;">
                <h1>🚨 Erro de Conexão</h1>
                <p>Não foi possível conectar ao servidor FGTS.</p>
                <p>Verifique se:</p>
                <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                  <li>O arquivo .env está configurado</li>
                  <li>A porta 3004 não está sendo usada</li>
                  <li>As dependências estão instaladas</li>
                </ul>
                <p><strong>URL esperada:</strong> ${SERVER_URL}/fgts</p>
                <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px;">
                  🔄 Tentar Novamente
                </button>
              </body>
            </html>
          `);
          return;
        }
        
        setTimeout(tryLoad, 2000);
      }
    };
    
    tryLoad();
  };

  // Mostrar janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Abrir DevTools em modo desenvolvimento
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Tentar carregar a página
  checkServerAndLoad();

  // Abrir links externos no navegador padrão
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Fechar aplicação quando janela for fechada
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Configurações',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.loadURL(`${SERVER_URL}/fgts`);
          }
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Ferramentas',
      submenu: [
        {
          label: 'Logs do Sistema',
          click: () => {
            mainWindow.loadURL(`${SERVER_URL}/fgts/logs/erros`);
          }
        },
        {
          label: 'Estatísticas',
          click: () => {
            mainWindow.loadURL(`${SERVER_URL}/fgts/cache/estatisticas`);
          }
        },
        { type: 'separator' },
        {
          label: 'Recarregar',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.reload();
          }
        }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Sistema FGTS',
              message: 'Sistema FGTS Desktop v1.0.0',
              detail: 'Desenvolvido por Lunas Digital\n\nSistema automatizado para processamento de consultas FGTS com interface desktop intuitiva.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Iniciando servidor FGTS...');
    
    // Iniciar o servidor Node.js
    serverProcess = spawn('node', ['server.js'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let serverReady = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Server:', output);
      
      // Verificar se o servidor está pronto
      if (output.includes('API rodando na porta')) {
        console.log('✅ Servidor iniciado com sucesso!');
        serverReady = true;
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const error = data.toString();
      console.error('Server Error:', error);
      
      // Se for erro de porta em uso, tentar outra porta
      if (error.includes('EADDRINUSE')) {
        console.log('⚠️ Porta em uso, tentando porta alternativa...');
        serverProcess.kill();
        setTimeout(() => {
          startServer().then(resolve).catch(reject);
        }, 1000);
      }
    });

    serverProcess.on('error', (error) => {
      console.error('❌ Erro ao iniciar servidor:', error);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Servidor finalizado com código: ${code}`);
      if (!serverReady && code !== 0) {
        reject(new Error(`Servidor finalizou com erro: ${code}`));
      }
    });

    // Timeout para aguardar servidor
    setTimeout(() => {
      if (!serverReady) {
        console.log('⚠️ Timeout aguardando servidor, tentando continuar...');
        resolve();
      }
    }, 5000);
  });
}

// Eventos da aplicação
app.whenReady().then(async () => {
  try {
    // Criar janela primeiro
    createWindow();
    createMenu();
    
    // Iniciar servidor em background
    startServer().then(() => {
      console.log('✅ Servidor iniciado em background');
    }).catch((error) => {
      console.error('❌ Erro no servidor:', error);
      // Mostrar página de erro na janela
      mainWindow.loadURL(`data:text/html,
        <html>
          <head><title>Sistema FGTS - Erro</title></head>
          <body style="font-family: Arial; padding: 50px; text-align: center;">
            <h1>🚨 Erro no Servidor</h1>
            <p>Não foi possível iniciar o servidor FGTS.</p>
            <p><strong>Erro:</strong> ${error.message}</p>
            <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px;">
              🔄 Tentar Novamente
            </button>
          </body>
        </html>
      `);
    });
    
    console.log('✅ Aplicação FGTS iniciada!');
  } catch (error) {
    console.error('❌ Erro ao iniciar aplicação:', error);
    dialog.showErrorBox('Erro', 'Não foi possível iniciar a aplicação.');
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers para comunicação com o renderer
ipcMain.handle('get-server-status', async () => {
  try {
    const response = await fetch(`${SERVER_URL}/fgts/status`);
    const data = await response.json();
    return data;
  } catch (error) {
    return { status: 'offline', error: error.message };
  }
});

ipcMain.handle('open-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Arquivos CSV', extensions: ['csv'] },
      { name: 'Todos os arquivos', extensions: ['*'] }
    ]
  });
  
  return result;
});

// Prevenir navegação para URLs externas
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== SERVER_URL) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
});
