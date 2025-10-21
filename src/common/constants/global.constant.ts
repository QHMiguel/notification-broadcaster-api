import { join } from "path";

export enum DB_NAME {
	EXP_SERV_CWRV = "EXP_SERV_CWRV"
}

export const FIREBASE_PATH_KEY = join(process.cwd(), 'src', 'integrations', 'firebase', 'keys');
