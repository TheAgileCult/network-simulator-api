import { Request } from "express";
import { ICustomer } from "./customer";


declare global {
    interface JwtPayload {
        cardNumber: string;
        customerId: string;
        exp?: number; // JWT expiration time in seconds
        iat?: number; // JWT issued at time
    }

    interface AuthenticatedRequest extends Request {
        customer?: ICustomer;
        newToken?: string;
    }

    interface ExtendedAuthRequest extends Request {
        body: AuthRequest;
    }

    interface ExtendedWithdrawalRequest extends AuthenticatedRequest {
        body: WithdrawalRequest;
    }

    interface ExtendedBalanceRequest extends AuthenticatedRequest {
        body: BalanceRequest;
    }
}

