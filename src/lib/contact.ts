export type ExtractedContact = {
  phone?: string;
  email?: string;
  wechat?: string;
};

export function extractContact(input: string): ExtractedContact {
  const phone = input.match(/(?<!\d)(1[3-9]\d{9})(?!\d)/)?.[1];
  const email = input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const wechat = input.match(/(?:微信|wechat|wx)[:：\s]*([a-zA-Z][-_a-zA-Z0-9]{5,19})/i)?.[1];

  return {
    ...(phone ? { phone } : {}),
    ...(email ? { email } : {}),
    ...(wechat ? { wechat } : {}),
  };
}
