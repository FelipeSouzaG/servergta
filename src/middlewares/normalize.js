export const normalizePhone = (value) => value.replace(/\D/g, '');

export const normalizeRegister = (value) => value.replace(/\D/g, '');

export const normalizeEmail = (value) => value.trim().toLowerCase();

export const normalizePostalCode = (value) => value.replace(/\D/g, '');

export const normalizeDate = (dateString) => {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (isNaN(date)) return null;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

export const normalizeData = (req, res, next) => {
  const { phone, alternativePhone, register, email, postalCode } = req.body;

  if (phone) req.body.phone = normalizePhone(phone);
  if (alternativePhone)
    req.body.alternativePhone = normalizePhone(alternativePhone);
  if (register) req.body.register = normalizeRegister(register);
  if (email) req.body.email = normalizeEmail(email);
  if (postalCode) req.body.postalCode = normalizePostalCode(postalCode);

  next();
};
