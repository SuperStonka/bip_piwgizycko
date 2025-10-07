const axios = require('axios');
const cheerio = require('cheerio');

async function testMenuSelector() {
  const testUrl = 'http://bip.gizycko.piw.gov.pl';
  
  try {
    console.log('🔍 Testowanie selektora menu...');
    console.log(`📡 Pobieranie strony: ${testUrl}`);
    
    const response = await axios.get(testUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    console.log('\n📋 Testowanie różnych selektorów menu:');
    
    // Test głównego selektora
    const mainMenu = $('.moduletable_menu ul.menu');
    console.log(`✅ .moduletable_menu ul.menu: ${mainMenu.length} elementów`);
    
    if (mainMenu.length > 0) {
      console.log('\n📄 Znalezione linki w głównym menu:');
      mainMenu.find('a').each((i, el) => {
        const title = $(el).text().trim();
        const href = $(el).attr('href');
        console.log(`  ${i + 1}. "${title}" -> ${href}`);
      });
    }
    
    // Test alternatywnych selektorów
    const alternativeSelectors = [
      '.moduletable_menu ul',
      '.moduletable_menu .menu',
      '.menu',
      'ul.menu',
      '.moduletable_menu',
      '.moduletable',
      '.menu-module',
      'nav ul',
      '.navigation ul'
    ];
    
    console.log('\n🔍 Testowanie alternatywnych selektorów:');
    for (const selector of alternativeSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        console.log(`✅ ${selector}: ${elements.length} elementów`);
        
        // Pokaż pierwsze 3 linki
        const links = elements.find('a').slice(0, 3);
        if (links.length > 0) {
          console.log(`   Przykładowe linki:`);
          links.each((i, el) => {
            const title = $(el).text().trim();
            const href = $(el).attr('href');
            if (title) {
              console.log(`     - "${title}" -> ${href}`);
            }
          });
        }
      } else {
        console.log(`❌ ${selector}: 0 elementów`);
      }
    }
    
    // Test struktury HTML
    console.log('\n🏗️  Analiza struktury HTML:');
    console.log(`📄 Całkowita liczba linków na stronie: ${$('a').length}`);
    console.log(`📄 Liczba divów z klasą "moduletable": ${$('div[class*="moduletable"]').length}`);
    console.log(`📄 Liczba list ul: ${$('ul').length}`);
    console.log(`📄 Liczba list z klasą "menu": ${$('ul[class*="menu"]').length}`);
    
    // Pokaż wszystkie divy z moduletable
    console.log('\n📋 Wszystkie divy z klasą "moduletable":');
    $('div[class*="moduletable"]').each((i, el) => {
      const className = $(el).attr('class');
      const hasMenu = $(el).find('ul, .menu').length > 0;
      console.log(`  ${i + 1}. ${className} (ma menu: ${hasMenu})`);
    });
    
  } catch (error) {
    console.error('❌ Błąd testowania:', error.message);
  }
}

// Uruchom test
testMenuSelector();