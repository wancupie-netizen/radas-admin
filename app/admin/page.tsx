import {requireChatGPTUser} from '../chatgpt-auth';
import {owner} from '../../lib/content';
import Manager from './manager';
import {logout} from './login/actions';
export const dynamic='force-dynamic';
export default async function Page(){await requireChatGPTUser('/admin');if(!await owner())return <p>Akses pemilik sahaja.</p>;return <><form action={logout} style={{padding:12,textAlign:"right"}}><button type="submit">Log Keluar</button></form><Manager/></>}
