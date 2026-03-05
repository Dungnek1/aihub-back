export function generateNewPostNotificationHtml(data: {
  avatarUrl: string;
  username: string;
  title: string;
}): string {
  const avatarPath = data.avatarUrl
    ? `${process.env.API_GATEWAY_BASE_URL}/image/user/${data.avatarUrl}`
    : `${process.env.API_GATEWAY_BASE_URL}/image/user/user-default.jpg`;

  return `
<div style="display: flex; align-items: center; padding: 10px; ">
  <img src="${avatarPath}" alt="${data.username}"
       style="width: 50px; height: 50px; border-radius: 50%; margin-right: 10px; object-fit: cover; flex-shrink: 0;">
       
  <div style="
      display: flex; 
      flex-direction: column; 
      justify-content: center; 
      height: 50px; 
      overflow: hidden; 
      color: #FFFF; 
      font-size: 14px; 
      text-overflow: ellipsis;
      word-break: break-word;
      max-width: calc(100% - 60px);
      gap: 4px
  ">
    <strong style="font-size: 16px; line-height: 1.2;">${data.username}</strong>
    <div style="line-height: 1.2;">
      has posted a new article:
      <em style="font-style: italic;">"${data.title}"</em>
    </div>
  </div>
</div>
  `.trim();
}
