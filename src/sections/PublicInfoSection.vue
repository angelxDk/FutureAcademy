<template>
  <main class="public-info">
    <nav><router-link to="/conhecer">Future Academy</router-link><router-link to="/entrar">Acessar meu fichário →</router-link></nav>
    <template v-if="route.name === 'overview'">
      <p class="eyebrow">SEU FICHÁRIO ACADÊMICO · BETA</p>
      <h1>Aulas, prazos e ideias.<br>Um lugar para estudar.</h1>
      <p class="lead">Para estudantes que querem organizar a semana, escrever seus trabalhos e acompanhar o que precisam entregar.</p>
      <router-link class="primary-link" to="/entrar">Criar conta ou entrar</router-link>
      <section class="feature-grid"><article><h2>Planeje sua semana</h2><p>Cadastre matérias, importe a grade em PDF ou DOCX e acompanhe aulas e entregas na agenda.</p></article><article><h2>Escreva com espaço</h2><p>Use o caderno com rascunhos recuperáveis, modelos de anotação e exportação dos seus trabalhos.</p></article><article><h2>Monte sua mesa</h2><p>Abra caderno, tutor, sons de foco e grupos lado a lado. Ajuste o espaço ao seu estudo.</p></article></section>
      <section><h2>Gratuito para começar. Pro para estudar na nuvem.</h2><p>Use grade, agenda, caderno, mesa de estudo e IA local no plano gratuito. O Pro acrescenta o tutor na nuvem, sem download de modelo, com até 20 solicitações por dia (UTC). Consulte preço e disponibilidade no perfil antes de contratar.</p></section>
      <section><h2>Veja um exemplo de rotina</h2><ol><li>Importe o horário do semestre e confira as aulas reconhecidas.</li><li>Crie uma anotação para a disciplina e registre o prazo do trabalho.</li><li>Abra a mesa de estudo, inicie um ciclo de foco e escreva.</li></ol><p>O tutor local depende de um dispositivo compatível e pode errar. A plataforma está em beta; acompanhe os avisos de sincronização e mantenha cópias dos seus trabalhos.</p></section>
    </template>
    <template v-else-if="route.name === 'privacy'">
      <h1>Privacidade</h1><p>Atualizado em 13 de novembro de 2026.</p>
      <h2>Informações usadas pelo serviço</h2><p>O Future Academy usa o Supabase Auth para acesso à conta e o PostgreSQL do Supabase para armazenar perfil, matérias, horários, eventos, anotações, rascunhos, histórico de estudo e conversas salvas. Há cópias no armazenamento do navegador para recuperação local.</p>
      <h2>Quem vê o conteúdo</h2><p>Seu fichário pessoal é associado à sua conta. Nos grupos compartilhados, mensagens e identificação do autor ficam disponíveis aos participantes; o administrador pode excluir mensagens e remover participantes. Denúncias ficam disponíveis para a equipe responsável.</p>
      <h2>IA e integrações</h2><p>O WebLLM processa as perguntas no navegador após o download do modelo. O histórico salvo pode ser sincronizado com sua conta. Ao escolher Ollama, o conteúdo é enviado ao servidor configurado pela plataforma. Consultas à Crossref, previsão do tempo, Spotify e câmbio são transmitidas aos respectivos serviços quando você as solicita. Players e avatares externos também podem receber dados técnicos da conexão.</p><p>Se a equipe habilitar o endpoint opcional de IA paga, as solicitações feitas a ele serão enviadas ao provedor configurado. Ele vem desativado por padrão.</p>
      <h2>Cobrança e diagnóstico</h2><p>Ao contratar o Pro, identificação da conta e e-mail são usados para vincular a assinatura ao Stripe. Os dados de pagamento são preenchidos no checkout do provedor. A plataforma armazena identificadores e situação da assinatura. Registros financeiros mantidos pelo provedor seguem as políticas dele. Se o monitoramento Sentry estiver configurado, eventos técnicos filtrados podem ser enviados para diagnóstico, sem o conteúdo dos seus trabalhos ou conversas.</p>
      <h2>Suas escolhas</h2><p>No perfil você pode exportar e restaurar seu fichário pessoal e solicitar a exclusão definitiva da conta. A exclusão remove dados ativos, mensagens de sua autoria e grupos que você administra. Cópias que outros participantes já tenham feito não podem ser apagadas pela plataforma. Para remover cópias locais em outros dispositivos, limpe os dados do site nesses navegadores.</p><p>Notificações dependem da sua permissão e dos recursos do navegador. O serviço não garante lembretes com a página fechada.</p>
      <h2>Contato</h2><p>{{ support ? 'Para dúvidas sobre dados pessoais, entre em contato pelo canal abaixo.' : 'O canal de atendimento do responsável pela plataforma ainda precisa ser configurado antes do lançamento público.' }}</p>
    </template>
    <template v-else>
      <h1>Termos de uso · beta</h1><p>Atualizado em 13 de novembro de 2026.</p>
      <h2>Uso da plataforma</h2><p>O Future Academy oferece ferramentas de organização acadêmica, escrita, foco e estudo em grupo. Proteja sua conta e publique apenas conteúdo que você possa compartilhar. Você mantém os direitos sobre seus materiais.</p>
      <h2>Convivência</h2><p>Não use grupos para assédio, discriminação, exposição de dados pessoais, spam ou distribuição de conteúdo ilícito. Administradores podem remover participantes e mensagens. Use a opção de denúncia para registrar problemas.</p>
      <h2>Limitações do beta</h2><p>Recursos podem mudar e serviços externos podem ficar indisponíveis. Confira importações de horários, prazos, referências e respostas da IA. Mantenha cópias dos materiais importantes e acompanhe o estado da sincronização.</p>
      <h2>Conta e encerramento</h2><p>Você pode exportar seus dados e excluir sua conta pelo perfil. A exclusão de grupos administrados e mensagens é definitiva. Integrações externas seguem também as condições de seus fornecedores.</p>
      <h2>Planos</h2><p>O plano gratuito inclui organização acadêmica, caderno, mesa de estudo, grupos e IA local. O Pro acrescenta o tutor na nuvem, limitado a 20 solicitações por dia (UTC). Quando a contratação estiver disponível, o perfil mostrará o preço e a periodicidade configurados no Stripe antes do checkout. A assinatura tem renovação automática e pode ser gerenciada ou cancelada pelo portal no perfil. O cancelamento ao fim do período mantém o acesso até o término informado. Dúvidas de cobrança e pedidos de reembolso devem ser encaminhados ao suporte; os direitos aplicáveis ao consumidor permanecem preservados.</p>
    </template>
    <footer><router-link to="/privacidade">Privacidade</router-link><router-link to="/termos">Termos</router-link><a v-if="support" :href="`mailto:${support}`">Contato e suporte</a><router-link to="/entrar">Entrar</router-link></footer>
  </main>
</template>
<script setup>
import { useRoute } from 'vue-router';
const route = useRoute();
const support = import.meta.env.VITE_SUPPORT_EMAIL || 'angelycarodrigues11@gmail.com';
</script>
<style scoped>
.public-info { max-width:1040px; margin:auto; padding:32px 24px 60px; line-height:1.8; color:var(--app-text); }
nav,footer { display:flex; justify-content:space-between; flex-wrap:wrap; gap:16px; padding:16px 0; }
h1 { font-size:clamp(32px,5vw,58px); line-height:1.15; margin:48px 0 24px; letter-spacing:-1.5px; }
h2 { font-size:22px; margin:24px 0 8px; }
p { margin:12px 0; } .lead { max-width:650px; font-size:20px; }
.eyebrow { margin-top:48px; letter-spacing:2px; font-size:12px; }
.primary-link { display:inline-block; margin:18px 0; padding:12px 24px; background:#d9bd80; color:#142030; border-radius:12px; font-weight:700; text-decoration:none; }
.feature-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin:36px 0; }
article { border:1px solid var(--app-border); padding:20px; border-radius:16px; }
footer { margin-top:48px; border-top:1px solid var(--app-border); }
@media(max-width:700px) { .feature-grid { grid-template-columns:1fr; } }
</style>
