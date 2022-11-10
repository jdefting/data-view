import { randomGeometricBrownianMotion } from "d3fc";

export const getRandomData = (): number[] => {
  // TODO: get this kind of data without d3fc
  return randomGeometricBrownianMotion().steps(1e4)(1);
};
