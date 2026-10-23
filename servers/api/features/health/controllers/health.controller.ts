import type { RequestHandler, Response } from "express";
import { HTTP_STATUS } from "../../../constants/index.js";
import type { HealthService } from "../services/index.js";

type HealthResponse = Pick<Response, "json" | "status">;

export type HealthControllerDependencies = Readonly<{
  service: Pick<HealthService, "getHealth" | "getReadiness">;
}>;

export type HealthControllers = Readonly<{ health: RequestHandler; readiness: RequestHandler }>;

export const createHealthController = ({ service }: HealthControllerDependencies): HealthControllers => {
  const health: RequestHandler = (_request, response: HealthResponse) => {
    response.status(HTTP_STATUS.ok).json(service.getHealth());
  };
  const readiness: RequestHandler = (_request, response: HealthResponse) => {
    const result = service.getReadiness();
    response.status(result.status === "ready" ? HTTP_STATUS.ok : HTTP_STATUS.serviceUnavailable).json(result);
  };
  return Object.freeze({ health, readiness });
};
