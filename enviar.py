import json
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# 1. Carrega as senhas do arquivo .env (Segurança máxima)
load_dotenv()

# Configurações
CAMINHO_JSON = './src/data/dados_reais.json' # Onde está seu arquivo hoje
MONGO_URI = os.getenv('MONGO_URI')
DB_NAME = os.getenv('DB_NAME')
COLLECTION_NAME = os.getenv('COLLECTION_NAME')

def enviar_para_nuvem():
    if not MONGO_URI:
        print("❌ ERRO CRÍTICO: String de conexão não encontrada no .env")
        return

    print("--- INICIANDO UPLOAD SEGURO ---")

    # 2. Ler o arquivo local
    try:
        print(f"📂 Lendo JSON local: {CAMINHO_JSON}...")
        with open(CAMINHO_JSON, 'r', encoding='utf-8') as f:
            dados = json.load(f)
        print(f"   -> {len(dados)} registros carregados na memória.")
    except Exception as e:
        print(f"❌ Erro ao ler arquivo: {e}")
        return

    # 3. Conectar e Enviar
    try:
        print("🚀 Conectando ao MongoDB Atlas...")
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]

        # ESTRATÉGIA DE REFRESH:
        # Apaga os dados antigos para não duplicar e insere os novos atualizados
        result_delete = collection.delete_many({})
        print(f"🧹 Limpeza: {result_delete.deleted_count} documentos antigos removidos.")

        if dados:
            result_insert = collection.insert_many(dados)
            print(f"✅ SUCESSO: {len(result_insert.inserted_ids)} documentos novos inseridos no Atlas!")
        else:
            print("⚠️ O JSON estava vazio. Nada foi enviado.")

        client.close()

    except Exception as e:
        print(f"❌ Erro de Conexão com o Banco: {e}")

if __name__ == "__main__":
    enviar_para_nuvem()