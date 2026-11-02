import {requireChatGPTUser} from '../chatgpt-auth';
import {owner} from '../../lib/content';
import Manager from './manager';
export const dynamic='force-dynamic';
export default async function Page(){await requireChatGPTUser('/admin');if(!await owner())return <p>Akses pemilik sahaja.</p>;return <Manager/>}
