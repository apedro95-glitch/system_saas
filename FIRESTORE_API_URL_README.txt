TopBRS — API URL via Firestore

O app agora busca a URL da API em:
collection: system
document: config
campo: apiUrl

Exemplo:
apiUrl = "https://SEU-TUNNEL.trycloudflare.com"

Regra Firestore necessária para o frontend ler a URL:

match /system/{docId} {
  allow read: if docId == "config";
  allow write: if request.auth != null
    && exists(/databases/$(database)/documents/users/$(request.auth.uid))
    && (
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.saasOwner == true ||
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.systemOwner == true ||
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == "systemOwner"
    );
}

Automação futura na VPS:
1. Coloque serviceAccount.json em /root/topbrs-server
2. Instale firebase-admin: npm i firebase-admin dotenv
3. Use .env com LOCAL_API_PORT=45547 e FIREBASE_SERVICE_ACCOUNT=./serviceAccount.json
4. Rode: pm2 start tunnel-firestore-auto.js --name topbrs-tunnel-firestore
