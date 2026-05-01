
// BLOCK ACCESS IF EXPIRED
function checkPlan(){
  const exp = localStorage.getItem('plan_exp');
  if(!exp) return;

  if(Date.now() > Number(exp)){
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;color:white">
        <div>
          <h1>Plano expirado</h1>
          <p>Renove sua assinatura para continuar.</p>
          <button onclick="location.reload()">Atualizar</button>
        </div>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', checkPlan);
