console.log('Senha carregada:', process.env.FGTS_PASS_3);
console.log('Tamanho:', process.env.FGTS_PASS_3?.length);
console.log('Caracteres:', process.env.FGTS_PASS_3?.split('').map(c => c.charCodeAt(0)));
