
export interface IUser {

    userId: string;
    email: string;
    username: string;
    role: string;
}


export interface JwtPayload {
    userId: string;
    username: string;
    email: string;
    role: string;
}
