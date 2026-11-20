import { redirect } from 'next/navigation';

// As mensagens agora ficam no pop-up de chat: abre o perfil, onde fica o botão "Mensagem"
export default function ConversaPage({ params }) {
  redirect(`/u/${params.username}`);
}
