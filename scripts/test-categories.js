const axios = require('axios');
const cheerio = require('cheerio');

async function testCategoryStructure() {
  const testUrls = [
    'http://bip.gizycko.piw.gov.pl/index.php?option=com_content&view=category&layout=blog&id=78&Itemid=233', // Aktualności
    'http://bip.gizycko.piw.gov.pl/index.php?option=com_content&view=category&layout=blog&id=79&Itemid=468', // Oferty pracy
    'http://bip.gizycko.piw.gov.pl/index.php?option=com_content&view=category&layout=blog&id=80&Itemid=469'  // Zamówienia publiczne
  ];

  for (const url of testUrls) {
    try {
      console.log(`\n🔍 Testowanie kategorii: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Sprawdź różne selektory
      console.log('📋 Testowanie selektorów:');
      
      const selectors = [
        '.blog',
        '.items-row',
        '.blog .items-row',
        '.items-row a',
        '.blog a[href*="view=article"]',
        '.items-row a[href*="view=article"]',
        'a[href*="view=article"]',
        '.item-page',
        '.content',
        '.main-content'
      ];

      for (const selector of selectors) {
        const elements = $(selector);
        console.log(`  ${selector}: ${elements.length} elementów`);
        
        if (elements.length > 0 && selector.includes('a')) {
          // Pokaż pierwsze 3 linki
          elements.slice(0, 3).each((i, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr('href');
            if (title && href) {
              console.log(`    - "${title}" -> ${href}`);
            }
          });
        }
      }

      // Sprawdź strukturę HTML
      console.log('\n🏗️  Analiza struktury:');
      console.log(`  Całkowita liczba linków: ${$('a').length}`);
      console.log(`  Linki z view=article: ${$('a[href*="view=article"]').length}`);
      console.log(`  Divy z klasą blog: ${$('div[class*="blog"]').length}`);
      console.log(`  Divy z klasą items-row: ${$('div[class*="items-row"]').length}`);

      // Pokaż wszystkie divy z klasą blog
      console.log('\n📋 Wszystkie divy z klasą "blog":');
      $('div[class*="blog"]').each((i, el) => {
        const className = $(el).attr('class');
        const hasLinks = $(el).find('a').length;
        console.log(`  ${i + 1}. ${className} (linki: ${hasLinks})`);
      });

      // Pokaż wszystkie divy z klasą items-row
      console.log('\n📋 Wszystkie divy z klasą "items-row":');
      $('div[class*="items-row"]').each((i, el) => {
        const className = $(el).attr('class');
        const hasLinks = $(el).find('a').length;
        console.log(`  ${i + 1}. ${className} (linki: ${hasLinks})`);
      });

    } catch (error) {
      console.error(`❌ Błąd testowania ${url}:`, error.message);
    }
  }
}

// Uruchom test
testCategoryStructure();