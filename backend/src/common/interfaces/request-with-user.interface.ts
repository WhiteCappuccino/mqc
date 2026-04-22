import { Request } from "express";
import { JwtPayload } from "../../auth/jwt-payload.interface";

export type RequestWithUser = Request & { user: JwtPayload };
