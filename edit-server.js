const fs = require('fs');

// Ler arquivo
const content = fs.readFileSync('/root/api-lunas/INSS/server-inss.js.backup2', 'utf8');

// Substituir a seção de erro 404 pela lógica de download
const oldCode = `    // Se não há PDF, retornar erro
    if (!fs.existsSync(pdfPath)) {
      console.log('❌ [INSS] Arquivo PDF não encontrado:', pdfPath);
      return res.status(404).json({ 
        error: 'Arquivo PDF não encontrado',
        fileId: fileId,
        pdfPath: pdfPath
      });
    }`;

const newCode = `    // Se não há PDF, baixar da Kentro
    if (!fs.existsSync(pdfPath)) {
      console.log('📥 [INSS] PDF não encontrado, baixando da API da Kentro...');
      
      try {
        const kentroResponse = await fetch('https://lunasdigital.atenderbem.com/int/downloadFile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            queueId: 25,
            apiKey: process.env.KENTRO_API_KEY || 'cd4d0509169d4e2ea9177ac66c1c9376',
            fileId: parseInt(fileId),
            download: true
          }).toString()
        });

        if (!kentroResponse.ok) {
          throw new Error(\`Erro ao baixar PDF da Kentro: \${kentroResponse.status} \${kentroResponse.statusText}\`);
        }

        const pdfBuffer = await kentroResponse.arrayBuffer();
        await fsp.mkdir(path.dirname(pdfPath), { recursive: true });
        await fsp.writeFile(pdfPath, Buffer.from(pdfBuffer));
        
        console.log('✅ [INSS] PDF baixado da Kentro com sucesso');
      } catch (downloadError) {
        console.log('❌ [INSS] Erro ao baixar PDF da Kentro:', downloadError.message);
        return res.status(404).json({ 
          error: 'Arquivo PDF não encontrado e falha ao baixar da Kentro',
          fileId: fileId,
          details: downloadError.message
        });
      }
    }`;

// Adicionar link do simulador no cache
const cacheReturnCode = `        console.log('✅ [INSS] Dados extraídos do cache com sucesso');
        return res.json(extratoData);`;

const cacheReturnWithLink = `        
        // Gerar link do simulador
        const simuladorLink = \`https://inss.lunasdigital.com.br/inss/simulador.html?extrato=\${fileId}\`;
        extratoData.simuladorLink = simuladorLink;
        
        console.log('✅ [INSS] Dados extraídos do cache com sucesso');
        return res.json(extratoData);`;

// Adicionar link do simulador no resultado final
const finalReturnCode = `    console.log('✅ [INSS] Extração concluída com sucesso');
    console.log('📊 [INSS] Cliente:', resultado.cliente);
    console.log('📊 [INSS] Contratos encontrados:', resultado.contratos?.length || 0);
    
    res.json(resultado);`;

const finalReturnWithLink = `    console.log('✅ [INSS] Extração concluída com sucesso');
    console.log('📊 [INSS] Cliente:', resultado.cliente);
    console.log('📊 [INSS] Contratos encontrados:', resultado.contratos?.length || 0);
    
    // Gerar link do simulador
    const simuladorLink = \`https://inss.lunasdigital.com.br/inss/simulador.html?extrato=\${fileId}\`;
    resultado.simuladorLink = simuladorLink;
    
    res.json(resultado);`;

// Fazer as substituições
let newContent = content.replace(oldCode, newCode);
newContent = newContent.replace(cacheReturnCode, cacheReturnWithLink);
newContent = newContent.replace(finalReturnCode, finalReturnWithLink);

// Salvar
fs.writeFileSync('/root/api-lunas/INSS/server-inss.js', newContent, 'utf8');
console.log('✅ Arquivo atualizado com sucesso!');


