// rota para mudar os "não autorizados" para fase 3
app.post("/fgts/mudarFaseNaoAutorizados", async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ message: "IDs inválidos" });
  }

  io.emit("log", `[SERVER] Iniciando mudança de fase para ${ids.length} não autorizados...`);

  const resultados = [];
  for (const id of ids) {
    const ok = await disparaFluxo(id, 3);
    resultados.push({ id, sucesso: ok });

    if (ok) {
      io.emit("log", `[SERVER] ✅ ID ${id} atualizado para fase 3 (sem autorização)`);
    } else {
      io.emit("log", `[SERVER] ❌ Falha ao atualizar ID ${id} para fase 3`);
    }
  }

  io.emit("log", `[SERVER] Finalizado processamento dos não autorizados`);

  res.json({ message: "Processo concluído", resultados });
});
