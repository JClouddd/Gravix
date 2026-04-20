export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const domains = searchParams.get('domains');

  if (domains === 'all') {
    // For now, return an empty array of notebooks to trigger the placeholder.
    return Response.json({
      notebooks: []
    });
  }

  return Response.json({ notebooks: [] });
}
