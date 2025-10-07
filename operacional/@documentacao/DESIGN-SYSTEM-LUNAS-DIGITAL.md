# 🎨 DESIGN SYSTEM - LUNAS DIGITAL

## 📋 **ÍNDICE**
1. [Identidade Visual](#identidade-visual)
2. [Cores da Marca](#cores-da-marca)
3. [Tipografia](#tipografia)
4. [Sistema de Botões](#sistema-de-botões)
5. [Menu Lateral](#menu-lateral)
6. [Layout e Espaçamentos](#layout-e-espaçamentos)
7. [Componentes](#componentes)
8. [Templates de Páginas](#templates-de-páginas)
9. [Código CSS Base](#código-css-base)
10. [JavaScript Base](#javascript-base)

---

## 🎯 **IDENTIDADE VISUAL**

### **Marca: Lunas Digital**
- **Cores Principais**: Teal/Cyan e Purple/Indigo
- **Estilo**: Clean, Moderno, Profissional
- **Inspiração**: Finanto.com.br (design limpo e elegante)

---

## 🌈 **CORES DA MARCA**

### **Cores Primárias**
```css
/* Gradiente Principal */
--gradient-primary: linear-gradient(135deg, #00d4aa 0%, #5a67d8 50%, #7c3aed 100%);

/* Cores Individuais */
--teal-primary: #00d4aa;      /* Teal principal */
--blue-primary: #5a67d8;      /* Azul médio */
--purple-primary: #7c3aed;    /* Roxo principal */
```

### **Cores Secundárias**
```css
/* Neutros */
--white: #ffffff;
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;

/* Estados */
--success: #10b981;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

### **Cores de Status**
```css
/* Status Colors */
--status-success: #dcfce7;    /* Verde claro */
--status-pending: #fef3c7;    /* Amarelo claro */
--status-error: #fee2e2;      /* Vermelho claro */
--status-info: #dbeafe;       /* Azul claro */
--status-neutral: #f3f4f6;    /* Cinza claro */
```

---

## 📝 **TIPOGRAFIA**

### **Fontes**
```css
/* Font Family */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Tamanhos */
--text-xs: 0.75rem;     /* 12px */
--text-sm: 0.875rem;    /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg: 1.125rem;    /* 18px */
--text-xl: 1.25rem;     /* 20px */
--text-2xl: 1.5rem;     /* 24px */
--text-3xl: 1.875rem;   /* 30px */
--text-4xl: 2.25rem;    /* 36px */

/* Pesos */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## 🔘 **SISTEMA DE BOTÕES**

### **Botão Primário**
```css
.btn-primary {
    background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 100%);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
}
```

### **Botão Secundário**
```css
.btn-secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-secondary:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
}
```

### **Botão de Ação**
```css
.btn-action {
    background: #ffffff;
    color: #5a67d8;
    border: 2px solid #5a67d8;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-action:hover {
    background: #5a67d8;
    color: white;
}
```

### **Botão de Status**
```css
.btn-success { background: #10b981; color: white; }
.btn-warning { background: #f59e0b; color: white; }
.btn-error { background: #ef4444; color: white; }
.btn-info { background: #3b82f6; color: white; }
```

---

## 📱 **MENU LATERAL**

### **Estrutura HTML**
```html
<!-- Zona de Hover para abrir menu -->
<div class="hover-zone" title="Passe o mouse aqui para abrir o menu"></div>

<!-- Barra Lateral de Navegação -->
<div class="sidebar" id="sidebar">
    <div class="sidebar-header">
        <h2 class="sidebar-title" id="sidebarTitle">
            <span id="sidebarIcon">🏠</span>
            <span id="sidebarText">Página Ativa</span>
        </h2>
        <button class="sidebar-close" id="sidebarClose">×</button>
    </div>
    <div class="sidebar-content">
        <ul class="nav-menu">
            <li class="nav-item">
                <a href="/pagina" class="nav-link">
                    🏠 <span class="nav-text">Página</span>
                </a>
            </li>
        </ul>
    </div>
</div>
```

### **CSS do Menu**
```css
/* Barra Lateral de Navegação */
.sidebar { 
    position: fixed; 
    top: 0; 
    left: 0; 
    width: 60px; 
    height: 100vh; 
    background: #ffffff; 
    box-shadow: 4px 0 20px rgba(0, 0, 0, 0.1); 
    transition: all 0.3s ease; 
    z-index: 1000; 
    overflow-y: auto; 
    border-right: 1px solid #e5e7eb;
}

.sidebar.open { 
    left: 0; 
    width: 400px; 
}

/* Zona de Hover */
.hover-zone {
    position: fixed;
    top: 0;
    left: 0;
    width: 20px;
    height: 100vh;
    z-index: 999;
    background: transparent;
}

.hover-zone:hover + .sidebar {
    width: 400px !important;
}

.hover-zone:hover + .sidebar .sidebar-header {
    opacity: 1 !important;
}

.hover-zone:hover + .sidebar .nav-link .nav-text {
    opacity: 1 !important;
}

/* Header do Menu */
.sidebar-header { 
    padding: 1rem; 
    border-bottom: 1px solid #e5e7eb; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 50%, #7c3aed 100%);
    opacity: 0;
    transition: opacity 0.3s ease;
    position: relative;
    overflow: hidden;
    min-height: 60px;
}

.sidebar-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: -20%;
    right: -20%;
    height: 100%;
    background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 50%, #7c3aed 100%);
    z-index: -1;
}

.sidebar.open .sidebar-header {
    opacity: 1;
}

.sidebar-title { 
    font-size: 1.25rem; 
    font-weight: 600; 
    color: #ffffff; 
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.sidebar-close { 
    background: none; 
    border: none; 
    font-size: 1.5rem; 
    cursor: pointer; 
    color: #ffffff; 
}

.sidebar-close:hover { 
    color: #f1f5f9; 
}

/* Conteúdo do Menu */
.sidebar-content { 
    padding: 0.5rem 1rem; 
    background: #ffffff;
    margin-top: -0.5rem;
}

.nav-menu { 
    list-style: none; 
    padding: 0;
    margin: 0;
}

.nav-item { 
    margin-bottom: 0.5rem; 
}

.nav-link { 
    display: flex; 
    align-items: center;
    padding: 0.75rem; 
    color: #64748b; 
    text-decoration: none; 
    border-radius: 8px; 
    transition: all 0.3s ease; 
    border: 1px solid transparent;
    white-space: nowrap;
    margin-bottom: 0.25rem;
}

.nav-link .nav-text {
    margin-left: 0.75rem;
    opacity: 0;
    transition: opacity 0.3s ease;
    font-size: 0.9rem;
    font-weight: 500;
}

.sidebar.open .nav-link .nav-text {
    opacity: 1;
}

.nav-link:hover { 
    background: #f1f5f9; 
    color: #1e293b; 
    border: 1px solid #e2e8f0;
}

.nav-link.active { 
    background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 100%); 
    color: white; 
    border: 1px solid #00d4aa;
}

/* Estado Fechado - Ícones */
.sidebar:not(.open) .nav-link {
    justify-content: center;
    padding: 0.75rem 0.5rem;
    margin-bottom: 1.2rem;
    display: flex;
    align-items: center;
    width: 100%;
}

.sidebar:not(.open) .nav-link span:first-child {
    font-size: 1.1rem;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    background: #f1f5f9;
    color: #64748b;
    transition: all 0.3s ease;
    margin: 0 auto;
    position: relative;
    overflow: hidden;
}

.sidebar:not(.open) .nav-link.active span:first-child {
    background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 50%, #7c3aed 100%);
    color: white;
    position: relative;
}

.sidebar:not(.open) .nav-link.active span:first-child::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -18px;
    right: -18px;
    height: calc(100% + 4px);
    background: linear-gradient(135deg, #00d4aa 0%, #5a67d8 50%, #7c3aed 100%);
    border-radius: 4px;
    z-index: -1;
}

.sidebar:not(.open) .nav-link:hover span:first-child {
    background: #e2e8f0;
    color: #1e293b;
}

@media (max-width: 768px) { 
    .sidebar { width: 100%; right: -100%; }
}
```

### **JavaScript do Menu**
```javascript
document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const hoverZone = document.querySelector('.hover-zone');
    const sidebarClose = document.getElementById('sidebarClose');
    
    if (sidebarClose) {
        sidebarClose.onclick = () => {
            sidebar.classList.remove('open');
        };
    }

    if (hoverZone && sidebar) {
        hoverZone.addEventListener('mouseenter', () => {
            sidebar.classList.add('open');
        });
        
        sidebar.addEventListener('mouseleave', () => {
            sidebar.classList.remove('open');
        });
        
        sidebar.addEventListener('mouseenter', () => {
            sidebar.classList.add('open');
        });
    }

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const icon = link.querySelector('span:first-child').textContent.trim();
            const text = link.querySelector('.nav-text').textContent.trim();
            
            const sidebarIcon = document.getElementById('sidebarIcon');
            const sidebarText = document.getElementById('sidebarText');
            
            if (sidebarIcon) sidebarIcon.textContent = icon;
            if (sidebarText) sidebarText.textContent = text;
        });
    });

    document.addEventListener('click', (e) => {
        if (sidebar && sidebar.classList.contains('open')) {
            if (!sidebar.contains(e.target) && !hoverZone.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        }
    });
});
```

---

## 📐 **LAYOUT E ESPAÇAMENTOS**

### **Sistema de Grid**
```css
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1rem;
}

.grid {
    display: grid;
    gap: 1.5rem;
}

.grid-2 { grid-template-columns: repeat(2, 1fr); }
.grid-3 { grid-template-columns: repeat(3, 1fr); }
.grid-4 { grid-template-columns: repeat(4, 1fr); }

@media (max-width: 768px) {
    .grid-2, .grid-3, .grid-4 {
        grid-template-columns: 1fr;
    }
}
```

### **Espaçamentos**
```css
/* Padding */
.p-1 { padding: 0.25rem; }
.p-2 { padding: 0.5rem; }
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.p-6 { padding: 1.5rem; }
.p-8 { padding: 2rem; }

/* Margin */
.m-1 { margin: 0.25rem; }
.m-2 { margin: 0.5rem; }
.m-3 { margin: 0.75rem; }
.m-4 { margin: 1rem; }
.m-6 { margin: 1.5rem; }
.m-8 { margin: 2rem; }

/* Gap */
.gap-1 { gap: 0.25rem; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
.gap-8 { gap: 2rem; }
```

---

## 🧩 **COMPONENTES**

### **Card**
```css
.card {
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    border: 1px solid #e5e7eb;
}

.card-header {
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
}

.card-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
}

.card-content {
    color: #6b7280;
    line-height: 1.6;
}
```

### **Badge de Status**
```css
.badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
}

.badge-success {
    background: #dcfce7;
    color: #166534;
}

.badge-warning {
    background: #fef3c7;
    color: #92400e;
}

.badge-error {
    background: #fee2e2;
    color: #991b1b;
}

.badge-info {
    background: #dbeafe;
    color: #1e40af;
}
```

### **Input**
```css
.input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.875rem;
    transition: all 0.3s ease;
}

.input:focus {
    outline: none;
    border-color: #5a67d8;
    box-shadow: 0 0 0 3px rgba(90, 103, 216, 0.1);
}

.input-error {
    border-color: #ef4444;
}

.input-error:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

---

## 📄 **TEMPLATES DE PÁGINAS**

### **Template Base**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nome da Página - Lunas Digital</title>
    <style>
        /* CSS do Design System aqui */
    </style>
</head>
<body>
    <!-- Conteúdo da Página -->
    <div class="container">
        <h1>Título da Página</h1>
        <p>Conteúdo da página...</p>
    </div>

    <!-- Menu Lateral -->
    <!-- HTML do Menu aqui -->

    <!-- JavaScript -->
    <script>
        // JavaScript do Menu aqui
    </script>
</body>
</html>
```

### **Template de Dashboard**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - Lunas Digital</title>
    <style>
        /* CSS do Design System */
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="card">
            <div class="card-header">
                <h1 class="card-title">📊 Dashboard</h1>
            </div>
        </div>

        <!-- Métricas -->
        <div class="grid grid-4">
            <div class="card">
                <h3>Total</h3>
                <p class="text-3xl font-bold text-teal-600">1,234</p>
            </div>
            <div class="card">
                <h3>Sucessos</h3>
                <p class="text-3xl font-bold text-green-600">987</p>
            </div>
            <div class="card">
                <h3>Pendentes</h3>
                <p class="text-3xl font-bold text-yellow-600">123</p>
            </div>
            <div class="card">
                <h3>Erros</h3>
                <p class="text-3xl font-bold text-red-600">45</p>
            </div>
        </div>

        <!-- Gráficos/Listas -->
        <div class="grid grid-2">
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Atividade Recente</h2>
                </div>
                <div class="card-content">
                    <!-- Lista de atividades -->
                </div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">Status</h2>
                </div>
                <div class="card-content">
                    <!-- Lista de status -->
                </div>
            </div>
        </div>
    </div>

    <!-- Menu Lateral -->
    <!-- HTML do Menu aqui -->

    <!-- JavaScript -->
    <script>
        // JavaScript do Menu aqui
    </script>
</body>
</html>
```

### **Template de Configurações**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Configurações - Lunas Digital</title>
    <style>
        /* CSS do Design System */
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="card-header">
                <h1 class="card-title">⚙️ Configurações</h1>
            </div>
            <div class="card-content">
                <form>
                    <div class="form-group">
                        <label>Nome da Configuração</label>
                        <input type="text" class="input" placeholder="Digite o valor...">
                    </div>
                    <div class="form-group">
                        <label>Descrição</label>
                        <textarea class="input" rows="3"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Salvar</button>
                        <button type="button" class="btn-secondary">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Menu Lateral -->
    <!-- HTML do Menu aqui -->

    <!-- JavaScript -->
    <script>
        // JavaScript do Menu aqui
    </script>
</body>
</html>
```

---

## 🎨 **CÓDIGO CSS BASE**

### **Reset e Base**
```css
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #374151;
    background: #f9fafb;
}

h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.25;
    color: #1f2937;
}

a {
    color: #5a67d8;
    text-decoration: none;
}

a:hover {
    color: #4c51bf;
}

button {
    font-family: inherit;
    cursor: pointer;
}

input, textarea, select {
    font-family: inherit;
}
```

### **Utilitários**
```css
/* Display */
.hidden { display: none; }
.block { display: block; }
.inline { display: inline; }
.inline-block { display: inline-block; }
.flex { display: flex; }
.grid { display: grid; }

/* Flexbox */
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }

/* Text */
.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

/* Colors */
.text-teal { color: #00d4aa; }
.text-blue { color: #5a67d8; }
.text-purple { color: #7c3aed; }
.text-gray { color: #6b7280; }
.text-white { color: #ffffff; }

/* Background */
.bg-teal { background-color: #00d4aa; }
.bg-blue { background-color: #5a67d8; }
.bg-purple { background-color: #7c3aed; }
.bg-white { background-color: #ffffff; }
.bg-gray { background-color: #f3f4f6; }
```

---

## ⚡ **JAVASCRIPT BASE**

### **Funções Utilitárias**
```javascript
// Debounce para otimizar eventos
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle para limitar execuções
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Formatar números
function formatNumber(num) {
    return new Intl.NumberFormat('pt-BR').format(num);
}

// Formatar moeda
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Formatar data
function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
}

// Gerar ID único
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Validar email
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Validar CPF
function isValidCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11) return false;
    
    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validar dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
}
```

### **Sistema de Notificações**
```javascript
class NotificationSystem {
    constructor() {
        this.container = this.createContainer();
    }

    createContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(container);
        return container;
    }

    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 1rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border-left: 4px solid ${this.getColor(type)};
            min-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.2rem;">${this.getIcon(type)}</span>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="margin-left: auto; background: none; border: none; cursor: pointer;">×</button>
            </div>
        `;

        this.container.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
    }

    getColor(type) {
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    getIcon(type) {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        return icons[type] || icons.info;
    }
}

// CSS para animação
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

// Instância global
const notifications = new NotificationSystem();
```

---

## 🚀 **COMO USAR EM NOVOS PROJETOS**

### **1. Estrutura de Arquivos**
```
projeto/
├── index.html
├── css/
│   ├── design-system.css
│   └── custom.css
├── js/
│   ├── design-system.js
│   └── app.js
└── assets/
    └── images/
```

### **2. HTML Base**
```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meu Projeto - Lunas Digital</title>
    <link rel="stylesheet" href="css/design-system.css">
    <link rel="stylesheet" href="css/custom.css">
</head>
<body>
    <!-- Conteúdo -->
    
    <!-- Menu Lateral -->
    <!-- Incluir HTML do menu -->
    
    <script src="js/design-system.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
```

### **3. CSS Customizado**
```css
/* custom.css */
/* Apenas estilos específicos do projeto */

.my-custom-component {
    /* Estilos específicos */
}
```

### **4. JavaScript da Aplicação**
```javascript
// app.js
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar aplicação
    console.log('Aplicação iniciada com Design System Lunas Digital');
});
```

---

## 📚 **FUNÇÕES DAS PÁGINAS**

### **Página Inicial**
- **Função**: Dashboard principal com visão geral
- **Componentes**: Cards de métricas, gráficos, lista de atividades
- **Navegação**: Links para todas as outras páginas

### **Painel FGTS**
- **Função**: Sistema de consulta e processamento de FGTS
- **Componentes**: Upload de CSV, progresso, listas de resultados
- **Funcionalidades**: Processamento em lote, status em tempo real

### **Dashboard**
- **Função**: Métricas e estatísticas do sistema
- **Componentes**: Gráficos, KPIs, relatórios
- **Dados**: Performance, erros, sucessos

### **Configurações**
- **Função**: Gerenciar configurações do sistema
- **Componentes**: Formulários, validações, salvamento
- **Dados**: Credenciais, parâmetros, preferências

### **Logs**
- **Função**: Visualizar logs do sistema
- **Componentes**: Lista de logs, filtros, busca
- **Dados**: Erros, eventos, debug

### **Cache**
- **Função**: Gerenciar cache persistente
- **Componentes**: Lista de cache, limpeza, estatísticas
- **Dados**: Estado do sistema, dados temporários

---

## 🎯 **RESUMO**

Este Design System fornece:

✅ **Identidade visual consistente** da Lunas Digital
✅ **Componentes reutilizáveis** para qualquer projeto
✅ **Sistema de cores** baseado na marca
✅ **Menu lateral** com navegação hover
✅ **Templates de páginas** prontos para uso
✅ **JavaScript utilitário** para funcionalidades comuns
✅ **CSS responsivo** e moderno
✅ **Documentação completa** para referência

**Use este sistema como base para todos os seus projetos futuros!** 🚀
