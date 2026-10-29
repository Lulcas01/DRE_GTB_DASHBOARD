import json
import os
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

# 1. Carrega as configurações do arquivo .env
load_dotenv()

CAMINHO_JSON = './src/data/dados_reais2.json' 
MONGO_URI = os.getenv('MONGO_URI')
DB_NAME = os.getenv('DB_NAME')
COLLECTION_NAME = os.getenv('COLLECTION_NAME')

def atualizar_marco_na_nuvem():
    if not MONGO_URI:
        print("❌ ERRO: String de conexão não encontrada no .env")
        return

    print("--- INICIANDO ATUALIZAÇÃO DE MARÇO (2026) ---")

    # 2. Ler o arquivo JSON que você gerou do Excel
    try:
        print(f"📂 Lendo JSON: {CAMINHO_JSON}...")
        with open(CAMINHO_JSON, 'r', encoding='utf-8') as f:
            dados_completos = json.load(f)
    except Exception as e:
        print(f"❌ Erro ao ler arquivo: {e}")
        return

    # === FILTRAR APENAS MARÇO ===
    # O seu Excel agora tem "MAR", então o ID no JSON será algo como "Posto-MAR-2026"
    dados_marco = [item for item in dados_completos if 'MAR' in str(item.get('id', '')).upper()]

    print(f"🔍 Encontrados {len(dados_marco)} registros de MARÇO para processar.")

    if not dados_marco:
        print("⚠️ Atenção: Não achei nenhum dado de 'MAR' no JSON. Verifique se você rodou o script do Excel primeiro!")
        return

    # 3. Conectar e Sincronizar
    try:
        print("🚀 Conectando ao MongoDB Atlas...")
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db[COLLECTION_NAME]

        operacoes = []
        for item in dados_marco:
            # O filtro garante que ele ache exatamente o mês de março de cada posto em 2026
            filtro = {'id': item['id']} 
            
            # Atualiza os valores existentes ou insere se for novo (Upsert)
            operacoes.append(UpdateOne(filtro, {'$set': item}, upsert=True))

        if operacoes:
            resultado = collection.bulk_write(operacoes)
            print(f"✅ SUCESSO:")
            print(f"   -> {resultado.upserted_count} novos registros de Março inseridos.")
            print(f"   -> {resultado.modified_count} registros de Março que já existiam foram atualizados.")
        
        client.close()
        print("--- PROCESSO CONCLUÍDO ---")

    except Exception as e:
        print(f"❌ Erro no Banco: {e}")

if __name__ == "__main__":
    atualizar_marco_na_nuvem()