export function generateReactionNotificationHtml(data: {
  avatarUrl: string;
  username: string;
  reactionType: string;
  postTitle: string;
}): string {
  const avatarPath = data.avatarUrl
    ? `${process.env.API_GATEWAY_BASE_URL}/${data.avatarUrl}`
    : `${process.env.API_GATEWAY_BASE_URL}/image/user/user-default.jpg`;

  // Map reaction types to icons
  const reactionIcons: Record<string, string> = {
    LIKE: '👍',
    LOVE: '❤️',
    LAUGH: '😂',
    ANGRY: '😠',
    SAD: '😢',
    WOW: '😮',
    THANKFUL: '🙏',
    THUONGTHUONG: '🥰',
  };

  const icon = reactionIcons[data.reactionType.toUpperCase()] || '👍';

  return `
<div style="display: flex; align-items: center; padding: 10px;">
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
      reacted ${icon} to your post 
      <em style="font-style: italic;">"${data.postTitle}"</em>
    </div>
  </div>
</div>
  `.trim();
}