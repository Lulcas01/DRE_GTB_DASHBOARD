import json
import os
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

# 1. Carrega as senhas do arquivo .env (Segurança máxima)
load_dotenv()

# Configurações
CAMINHO_JSON = './src/data/dados_reais2.json' 
MONGO_URI = os.getenv('MONGO_URI')
DB_NAME = os.getenv('DB_NAME')
COLLECTION_NAME = os.getenv('COLLECTION_NAME')

def enviar_para_nuvem():
    if not MONGO_URI:
        print("❌ ERRO CRÍTICO: String de conexão não encontrada no .env")
        return

    print("--- INICIANDO UPLOAD (SOMENTE AGO) ---")

    # 2. Ler o arquivo local
    try:
        print(f"📂 Lendo JSON local: {CAMINHO_JSON}...")
        with open(CAMINHO_JSON, 'r', encoding='utf-8') as f:
            dados_completos = json.load(f)
        print(f"   -> {len(dados_completos)} registros totais lidos do JSON.")
    except Exception as e:
        print(f"❌ Erro ao ler arquivo: {e}")
        return

    # === O SEGREDO ESTÁ AQUI: FILTRAR SÓ AGO ===
    # Procura a palavra "AGO" (de AGO) dentro do campo 'id' de cada item
    dados_AGO = [item for item in dados_completos if 'AGO' in str(item.get('id', '')).upper()]

    print(f"🔍 Filtro aplicado: {len(dados_AGO)} registros de AGO encontrados para envio.")

    if not dados_AGO:
        print("⚠️ Nenhum dado de AGO foi encontrado no JSON. Nada foi enviado.")
        return

    # 3. Conectar e Enviar
    try:
        print("🚀 Conectando ao MongoDB Atlas...")
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]

        print("🔄 Enviando os dados de AGO para o banco...")
        operacoes = []
        
        for item in dados_AGO:
            filtro = {'id': item['id']} 
            operacoes.append(UpdateOne(filtro, {'$set': item}, upsert=True))

        resultado = collection.bulk_write(operacoes)
        
        print(f"✅ SUCESSO! Apenas AGO foi processado:")
        print(f"   -> {resultado.upserted_count} registros NOVOS de AGO inseridos")
        print(f"   -> {resultado.modified_count} registros de AGO atualizados (se já existiam)")
        
        client.close()

    except Exception as e:
        print(f"❌ Erro de Conexão com o Banco: {e}")

if __name__ == "__main__":
    enviar_para_nuvem()