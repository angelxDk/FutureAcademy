import sys
import json
import urllib.request
import urllib.error
import os

def parse_timetable():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Nenhum arquivo de texto fornecido."}))
        sys.exit(1)

    file_path = sys.argv[1]
    
    if not os.path.exists(file_path):
        print(json.dumps({"error": "Arquivo não encontrado."}))
        sys.exit(1)

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print(json.dumps({"error": "OPENAI_API_KEY não está configurada."}))
        sys.exit(1)

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    if not content.strip():
        print(json.dumps({"error": "O arquivo está vazio."}))
        sys.exit(1)

    prompt = (
        "Você é um analisador rigoroso e especializado em conversão de tabelas de aulas e cronogramas acadêmicos.\n"
        "Seu objetivo é extrair uma lista estruturada de matérias ('subjects') e seus horários na semana ('timetable') a partir do texto que segue abaixo.\n"
        "O texto geralmente é uma tabela extraída de PDF ou Docx, ex: '19:00 - 19:50 LIBRAS Cleidyneth TERÇA-FEIRA Língua Portuguesa I Rosemere...' etc.\n\n"
        "Gere UM ÚNICO JSON no EXATO formato descrito abaixo. NÃO adicione markdown, respostas como 'Aqui está' nem acentos em chaves.\n"
        "{\n"
        "  \"subjects\": [\n"
        "    { \"name\": \"NOME DA MATÉRIA\", \"professorName\": \"NOME DO PROFESSOR (se houver, senão vazio)\" }\n"
        "  ],\n"
        "  \"timetable\": [\n"
        "    { \"subjectName\": \"NOME DA MATÉRIA (que combine com a lista acima)\", \"day\": NÚMERO (1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab, 0=Dom), \"start\": \"HH:MM\", \"end\": \"HH:MM\", \"place\": \"\" }\n"
        "  ]\n"
        "}\n\n"
        "Atenção: Os dias da semana DEVEM ser mapeados como números (1 a 6, 0). Extraia todas as matérias e todos os horários correspondentes disponíveis no texto. Se o professor estiver listado logo abaixo ou perto da disciplina, atribua-o.\n\n"
        f"TEXTO DO DOCUMENTO:\n{content}"
    )

    data = {
        "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        "messages": [
            {"role": "system", "content": "You are a helpful assistant designed to output strict JSON only."},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.0
    }

    req = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            
            # Extract content from choices
            output_text = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

            # Clean markdown codeblocks if they exist
            if output_text.startswith("```json"):
                output_text = output_text[7:]
            elif output_text.startswith("```"):
                output_text = output_text[3:]
                
            if output_text.endswith("```"):
                output_text = output_text[:-3]

            parsed_json = json.loads(output_text.strip())
            print(json.dumps(parsed_json))
            
    except urllib.error.URLError as e:
        error_msg = str(e)
        if hasattr(e, 'read'):
            error_msg = e.read().decode("utf-8")
        print(json.dumps({"error": f"Erro na API da OpenAI: {error_msg}"}))
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(json.dumps({"error": "Falha ao decodificar JSON da OpenAI. O formato retornado não era válido."}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": f"Erro inesperado: {str(e)}"}))
        sys.exit(1)

if __name__ == "__main__":
    parse_timetable()
