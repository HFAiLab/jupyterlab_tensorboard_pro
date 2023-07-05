export function copyToClipboard(text: string): boolean {
  const input = document.createElement('textarea');
  input.value = text;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  document.body.appendChild(input);
  input.select();
  const result = document.execCommand('copy');
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  document.body.removeChild(input);
  return result;
}
