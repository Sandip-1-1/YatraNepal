export interface FareResult {
  baseFare: number;
  vehicleFare: number;
  finalFare: number;
  discountPercent: number;
  userType: string;
  vehicleType: string;
}

/**
 * Calculate fare based on route base fare, vehicle type, and user type.
 * - Minibus fare = 70% of base fare
 * - Student / Senior = 45% discount on the vehicle fare
 */
export function calculateFare(
  baseFare: number,
  vehicleType: string,
  userType: string = "regular",
): FareResult {
  const vehicleFare =
    vehicleType === "minibus"
      ? Math.round(baseFare * 0.7)
      : baseFare;

  const discountPercent =
    userType === "student" || userType === "senior" ? 45 : 0;

  const finalFare =
    discountPercent > 0
      ? Math.round(vehicleFare * (1 - discountPercent / 100))
      : vehicleFare;

  return {
    baseFare,
    vehicleFare,
    finalFare,
    discountPercent,
    userType,
    vehicleType,
  };
}

export function formatFare(amount: number): string {
  return `Rs. ${amount}`;
}
