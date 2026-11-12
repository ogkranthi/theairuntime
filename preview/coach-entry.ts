import { handleChatRequest } from '../src/coach-chat/routes';
import type { ChatEnv } from '../src/coach-chat/types';
export { AiSecurityCoordinator } from '../src/security/coordinator';
// Preview-only safety wrapper. Production keeps its existing entry and routing.
export default {
  async fetch(request:Request,env:ChatEnv & {ASSETS:Fetcher}) {
    const url=new URL(request.url);
    if(!url.hostname.endsWith('.workers.dev')&&!['localhost','127.0.0.1'].includes(url.hostname))return new Response('Preview host required',{status:403});
    if(url.pathname.startsWith('/api/coach-chat/'))return handleChatRequest(request,env);
    if(url.pathname.startsWith('/api/'))return Response.json({error:'External integrations and unrelated AI endpoints are disabled in this preview.'},{status:503});
    return env.ASSETS.fetch(request);
  },
};
