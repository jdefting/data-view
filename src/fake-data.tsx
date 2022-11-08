import { randomGeometricBrownianMotion } from "d3fc";

export const getRandomData = (): number[] => {
  // TODO: get this kind of data without d3fc
  return randomGeometricBrownianMotion().steps(1e6)(1);
};

// export const getRandomData = (n: number) => {
//   const values = [];
//   const amplitude = 50;
//
//   for (let i = 0; i < n; i++) {
//     values.push(amplitude * Math.sin(i) + amplitude);
//   }
//
//   return values;
// };
