import { Request } from "express";
import { ICustomer } from "./customer";

export interface JwtPayload {
  cardNumber: string;
  customerId: string;
  cardType: string;
  exp?: number; // JWT expiration time in seconds
  iat?: number; // JWT issued at time
}


export interface AuthenticatedRequest extends Request {
  customer?: ICustomer;
  token?: string;
  user?: JwtPayload;
}

