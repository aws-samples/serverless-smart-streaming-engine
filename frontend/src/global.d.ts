// TypeScript가 css 파일을 모듈로 인식하지 못해서 에러가 발생
// css에 대한 모듈 형식을 선언해주는 것으로 문제를 해결
declare module "*.css" {
  const content: { [className: string]: string };
  export = content;
}
