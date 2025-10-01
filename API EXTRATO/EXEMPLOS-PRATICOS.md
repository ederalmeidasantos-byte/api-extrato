# 💻 Exemplos Práticos - API de Tokens V8

## 🚀 Exemplos por Linguagem

### **JavaScript/Node.js**

#### **Exemplo 1: Classe Completa de Integração**
```javascript
const axios = require('axios');

class FGTSAPIClient {
  constructor(apiUrl = 'https://api-extrato-1.onrender.com') {
    this.apiUrl = apiUrl;
    this.tokenCache = new Map();
  }

  async authenticate(username, password) {
    try {
      const response = await axios.post(`${this.apiUrl}/authenticate`, {
        username,
        password
      });
      
      this.tokenCache.set(username, {
        token: response.data.access_token,
        expiresAt: Date.now() + (response.data.expires_in * 1000)
      });
      
      return response.data.access_token;
    } catch (error) {
      throw new Error(`Erro na autenticação: ${error.response?.data?.error || error.message}`);
    }
  }

  async getValidToken(username, password) {
    const cached = this.tokenCache.get(username);
    
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.token;
    }
    
    return await this.authenticate(username, password);
  }

  async consultarFGTS(cpf, username, password) {
    const token = await this.getValidToken(username, password);
    
    // Aqui você faria a consulta real na API V8
    const response = await axios.post('https://api-v8.com/consulta-fgts', {
      cpf: cpf
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data;
  }
}

// Uso
const client = new FGTSAPIClient();

async function exemplo() {
  try {
    const resultado = await client.consultarFGTS(
      '12345678901',
      'seu@email.com',
      'sua_senha'
    );
    console.log('Resultado:', resultado);
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

exemplo();
```

#### **Exemplo 2: Função Simples**
```javascript
async function obterTokenFGTS(username, password) {
  const response = await axios.post('https://api-extrato-1.onrender.com/authenticate', {
    username,
    password
  });
  
  return response.data.access_token;
}

// Uso
obterTokenFGTS('seu@email.com', 'sua_senha')
  .then(token => console.log('Token:', token))
  .catch(error => console.error('Erro:', error));
```

---

### **Python**

#### **Exemplo 1: Classe Completa**
```python
import requests
import time
from datetime import datetime, timedelta

class FGTSAPIClient:
    def __init__(self, api_url='https://api-extrato-1.onrender.com'):
        self.api_url = api_url
        self.token_cache = {}
    
    def authenticate(self, username, password):
        try:
            response = requests.post(f'{self.api_url}/authenticate', json={
                'username': username,
                'password': password
            })
            response.raise_for_status()
            
            data = response.json()
            self.token_cache[username] = {
                'token': data['access_token'],
                'expires_at': datetime.now() + timedelta(seconds=data['expires_in'])
            }
            
            return data['access_token']
        except requests.exceptions.RequestException as e:
            raise Exception(f'Erro na autenticação: {e}')
    
    def get_valid_token(self, username, password):
        cached = self.token_cache.get(username)
        
        if cached and cached['expires_at'] > datetime.now() + timedelta(minutes=1):
            return cached['token']
        
        return self.authenticate(username, password)
    
    def consultar_fgts(self, cpf, username, password):
        token = self.get_valid_token(username, password)
        
        # Aqui você faria a consulta real na API V8
        response = requests.post('https://api-v8.com/consulta-fgts', 
            json={'cpf': cpf},
            headers={'Authorization': f'Bearer {token}'}
        )
        response.raise_for_status()
        
        return response.json()

# Uso
client = FGTSAPIClient()

try:
    resultado = client.consultar_fgts('12345678901', 'seu@email.com', 'sua_senha')
    print('Resultado:', resultado)
except Exception as e:
    print('Erro:', e)
```

#### **Exemplo 2: Função Simples**
```python
import requests

def obter_token_fgts(username, password):
    response = requests.post('https://api-extrato-1.onrender.com/authenticate', json={
        'username': username,
        'password': password
    })
    response.raise_for_status()
    return response.json()['access_token']

# Uso
try:
    token = obter_token_fgts('seu@email.com', 'sua_senha')
    print('Token:', token)
except Exception as e:
    print('Erro:', e)
```

---

### **PHP**

#### **Exemplo 1: Classe Completa**
```php
<?php
class FGTSAPIClient {
    private $apiUrl;
    private $tokenCache;
    
    public function __construct($apiUrl = 'https://api-extrato-1.onrender.com') {
        $this->apiUrl = $apiUrl;
        $this->tokenCache = [];
    }
    
    public function authenticate($username, $password) {
        $data = [
            'username' => $username,
            'password' => $password
        ];
        
        $response = $this->makeRequest('POST', '/authenticate', $data);
        
        if ($response['success']) {
            $this->tokenCache[$username] = [
                'token' => $response['access_token'],
                'expires_at' => time() + $response['expires_in']
            ];
            
            return $response['access_token'];
        }
        
        throw new Exception('Erro na autenticação: ' . $response['error']);
    }
    
    public function getValidToken($username, $password) {
        $cached = $this->tokenCache[$username] ?? null;
        
        if ($cached && $cached['expires_at'] > time() + 60) {
            return $cached['token'];
        }
        
        return $this->authenticate($username, $password);
    }
    
    public function consultarFGTS($cpf, $username, $password) {
        $token = $this->getValidToken($username, $password);
        
        // Aqui você faria a consulta real na API V8
        $response = $this->makeRequest('POST', 'https://api-v8.com/consulta-fgts', [
            'cpf' => $cpf
        ], [
            'Authorization: Bearer ' . $token
        ]);
        
        return $response;
    }
    
    private function makeRequest($method, $endpoint, $data = null, $headers = []) {
        $ch = curl_init();
        
        curl_setopt($ch, CURLOPT_URL, $endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
            $headers[] = 'Content-Type: application/json';
        }
        
        if ($headers) {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 400) {
            throw new Exception('HTTP Error: ' . $httpCode);
        }
        
        return json_decode($response, true);
    }
}

// Uso
$client = new FGTSAPIClient();

try {
    $resultado = $client->consultarFGTS('12345678901', 'seu@email.com', 'sua_senha');
    echo 'Resultado: ' . json_encode($resultado);
} catch (Exception $e) {
    echo 'Erro: ' . $e->getMessage();
}
?>
```

#### **Exemplo 2: Função Simples**
```php
<?php
function obterTokenFGTS($username, $password) {
    $data = [
        'username' => $username,
        'password' => $password
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://api-extrato-1.onrender.com/authenticate');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        return $data['access_token'];
    }
    
    throw new Exception('Erro ao obter token');
}

// Uso
try {
    $token = obterTokenFGTS('seu@email.com', 'sua_senha');
    echo 'Token: ' . $token;
} catch (Exception $e) {
    echo 'Erro: ' . $e->getMessage();
}
?>
```

---

### **C# (.NET)**

#### **Exemplo 1: Classe Completa**
```csharp
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class FGTSAPIClient
{
    private readonly HttpClient _httpClient;
    private readonly string _apiUrl;
    private readonly Dictionary<string, TokenCache> _tokenCache;

    public FGTSAPIClient(string apiUrl = "https://api-extrato-1.onrender.com")
    {
        _apiUrl = apiUrl;
        _httpClient = new HttpClient();
        _tokenCache = new Dictionary<string, TokenCache>();
    }

    public async Task<string> AuthenticateAsync(string username, string password)
    {
        var data = new
        {
            username = username,
            password = password
        };

        var json = JsonSerializer.Serialize(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync($"{_apiUrl}/authenticate", content);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<AuthResponse>(responseContent);

        _tokenCache[username] = new TokenCache
        {
            Token = result.AccessToken,
            ExpiresAt = DateTime.Now.AddSeconds(result.ExpiresIn)
        };

        return result.AccessToken;
    }

    public async Task<string> GetValidTokenAsync(string username, string password)
    {
        if (_tokenCache.TryGetValue(username, out var cached) && 
            cached.ExpiresAt > DateTime.Now.AddMinutes(1))
        {
            return cached.Token;
        }

        return await AuthenticateAsync(username, password);
    }

    public async Task<object> ConsultarFGTSAsync(string cpf, string username, string password)
    {
        var token = await GetValidTokenAsync(username, password);

        var data = new { cpf = cpf };
        var json = JsonSerializer.Serialize(data);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        _httpClient.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await _httpClient.PostAsync("https://api-v8.com/consulta-fgts", content);
        response.EnsureSuccessStatusCode();

        var responseContent = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<object>(responseContent);
    }
}

public class TokenCache
{
    public string Token { get; set; }
    public DateTime ExpiresAt { get; set; }
}

public class AuthResponse
{
    public string AccessToken { get; set; }
    public int ExpiresIn { get; set; }
}

// Uso
var client = new FGTSAPIClient();

try
{
    var resultado = await client.ConsultarFGTSAsync("12345678901", "seu@email.com", "sua_senha");
    Console.WriteLine($"Resultado: {resultado}");
}
catch (Exception ex)
{
    Console.WriteLine($"Erro: {ex.Message}");
}
```

---

### **Go**

#### **Exemplo 1: Estrutura Completa**
```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

type FGTSAPIClient struct {
    apiURL     string
    httpClient *http.Client
    tokenCache map[string]TokenCache
}

type TokenCache struct {
    Token     string
    ExpiresAt time.Time
}

type AuthRequest struct {
    Username string `json:"username"`
    Password string `json:"password"`
}

type AuthResponse struct {
    Success     bool   `json:"success"`
    AccessToken string `json:"access_token"`
    ExpiresIn   int    `json:"expires_in"`
    Error       string `json:"error"`
}

func NewFGTSAPIClient(apiURL string) *FGTSAPIClient {
    return &FGTSAPIClient{
        apiURL:     apiURL,
        httpClient: &http.Client{Timeout: 30 * time.Second},
        tokenCache: make(map[string]TokenCache),
    }
}

func (c *FGTSAPIClient) Authenticate(username, password string) (string, error) {
    data := AuthRequest{
        Username: username,
        Password: password,
    }

    jsonData, err := json.Marshal(data)
    if err != nil {
        return "", err
    }

    resp, err := c.httpClient.Post(c.apiURL+"/authenticate", "application/json", bytes.NewBuffer(jsonData))
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return "", err
    }

    var authResp AuthResponse
    if err := json.Unmarshal(body, &authResp); err != nil {
        return "", err
    }

    if !authResp.Success {
        return "", fmt.Errorf("erro na autenticação: %s", authResp.Error)
    }

    c.tokenCache[username] = TokenCache{
        Token:     authResp.AccessToken,
        ExpiresAt: time.Now().Add(time.Duration(authResp.ExpiresIn) * time.Second),
    }

    return authResp.AccessToken, nil
}

func (c *FGTSAPIClient) GetValidToken(username, password string) (string, error) {
    if cached, exists := c.tokenCache[username]; exists && cached.ExpiresAt.After(time.Now().Add(time.Minute)) {
        return cached.Token, nil
    }

    return c.Authenticate(username, password)
}

func (c *FGTSAPIClient) ConsultarFGTS(cpf, username, password string) (map[string]interface{}, error) {
    token, err := c.GetValidToken(username, password)
    if err != nil {
        return nil, err
    }

    data := map[string]string{"cpf": cpf}
    jsonData, err := json.Marshal(data)
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequest("POST", "https://api-v8.com/consulta-fgts", bytes.NewBuffer(jsonData))
    if err != nil {
        return nil, err
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Authorization", "Bearer "+token)

    resp, err := c.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    var result map[string]interface{}
    if err := json.Unmarshal(body, &result); err != nil {
        return nil, err
    }

    return result, nil
}

func main() {
    client := NewFGTSAPIClient("https://api-extrato-1.onrender.com")

    resultado, err := client.ConsultarFGTS("12345678901", "seu@email.com", "sua_senha")
    if err != nil {
        fmt.Printf("Erro: %v\n", err)
        return
    }

    fmt.Printf("Resultado: %+v\n", resultado)
}
```

---

## 🔧 Exemplos de Configuração

### **Variáveis de Ambiente**

#### **JavaScript/Node.js**
```bash
# .env
FGTS_API_URL=https://api-extrato-1.onrender.com
FGTS_USERNAME=seu@email.com
FGTS_PASSWORD=sua_senha
```

```javascript
require('dotenv').config();

const client = new FGTSAPIClient(process.env.FGTS_API_URL);
```

#### **Python**
```bash
# .env
FGTS_API_URL=https://api-extrato-1.onrender.com
FGTS_USERNAME=seu@email.com
FGTS_PASSWORD=sua_senha
```

```python
import os
from dotenv import load_dotenv

load_dotenv()

client = FGTSAPIClient(os.getenv('FGTS_API_URL'))
```

---

## 🚨 Tratamento de Erros Avançado

### **JavaScript com Retry**
```javascript
async function obterTokenComRetry(username, password, maxTentativas = 3) {
  for (let i = 0; i < maxTentativas; i++) {
    try {
      return await tokenAPI.getToken(username, password);
    } catch (error) {
      if (error.response?.status === 429) {
        const delay = Math.pow(2, i) * 1000; // Backoff exponencial
        console.log(`Tentativa ${i + 1} falhou, aguardando ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Máximo de tentativas atingido');
}
```

### **Python com Retry**
```python
import time
from functools import wraps

def retry_on_429(max_retries=3):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except requests.exceptions.HTTPError as e:
                    if e.response.status_code == 429:
                        delay = 2 ** attempt
                        print(f'Tentativa {attempt + 1} falhou, aguardando {delay}s...')
                        time.sleep(delay)
                        continue
                    raise
            raise Exception('Máximo de tentativas atingido')
        return wrapper
    return decorator

@retry_on_429()
def obter_token_com_retry(username, password):
    return client.get_token(username, password)
```

---

*Exemplos criados em: 30 de Setembro de 2024*
*Versão: 1.0.0*
