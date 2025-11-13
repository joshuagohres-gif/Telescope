/**
 * Web Scraper for Telescope Design Data
 * 
 * This script scrapes telescope design information from reliable public sources:
 * - Amateur Telescope Making resources (Stellafane, Cloudy Nights forums)
 * - NASA/ESA optical design papers
 * - Wikipedia optics/mechanics/astronomy articles
 * 
 * Usage: npm run scrape:design-data
 * Output: JSON files in server/seed/ directory
 */

import * as fs from 'fs';
import * as path from 'path';

// Note: In production, install cheerio or puppeteer for actual web scraping
// npm install cheerio axios
// For this template, we'll show the structure

interface ScrapedConcept {
  title: string;
  summary: string;
  bodyMd: string;
  tags: string[];
  difficulty: 'intro' | 'intermediate' | 'advanced';
  category: string;
  sourceUrl: string;
}

interface ScrapedEquation {
  name: string;
  latex: string;
  description: string;
  variables: any[];
  sourceUrl: string;
}

interface ScrapedExample {
  title: string;
  telescopeType: string;
  specs: Record<string, any>;
  sourceUrl: string;
}

class DesignDataScraper {
  private outputDir: string;

  constructor() {
    this.outputDir = path.join(__dirname, '../seed');
  }

  /**
   * Scrape telescope design concepts from Stellafane
   */
  async scrapeStellaFane(): Promise<ScrapedConcept[]> {
    console.log('📡 Scraping Stellafane ATM resources...');
    
    // Target URLs:
    // https://stellafane.org/tm/atm/index.html
    // https://stellafane.org/tm/atm/grind/index.html
    // https://stellafane.org/tm/atm/build/index.html
    
    const concepts: ScrapedConcept[] = [];
    
    // Example structure (in production, use actual HTTP requests):
    /*
    const response = await axios.get('https://stellafane.org/tm/atm/grind/index.html');
    const $ = cheerio.load(response.data);
    
    $('article').each((i, elem) => {
      const title = $(elem).find('h2').text();
      const content = $(elem).find('p').text();
      
      concepts.push({
        title,
        summary: content.substring(0, 200),
        bodyMd: content,
        tags: ['mirror-making', 'grinding'],
        difficulty: 'advanced',
        category: 'optics',
        sourceUrl: response.url,
      });
    });
    */
    
    console.log(`✅ Found ${concepts.length} concepts from Stellafane`);
    return concepts;
  }

  /**
   * Scrape optical equations from Wikipedia
   */
  async scrapeWikipediaOptics(): Promise<ScrapedEquation[]> {
    console.log('📡 Scraping Wikipedia optics articles...');
    
    // Target articles:
    // https://en.wikipedia.org/wiki/Reflecting_telescope
    // https://en.wikipedia.org/wiki/Refracting_telescope
    // https://en.wikipedia.org/wiki/Optical_resolution
    // https://en.wikipedia.org/wiki/Focal_ratio
    
    const equations: ScrapedEquation[] = [];
    
    // Example for extracting equations from Wikipedia LaTeX markup
    // Look for <math> tags or \( \) delimiters
    
    console.log(`✅ Found ${equations.length} equations from Wikipedia`);
    return equations;
  }

  /**
   * Scrape telescope examples from Cloudy Nights forums
   */
  async scrapeCloudyNights(): Promise<ScrapedExample[]> {
    console.log('📡 Scraping Cloudy Nights DIY telescope examples...');
    
    // Target forum sections:
    // https://www.cloudynights.com/forum/63-atm-optics-and-diy-forum/
    // Look for build threads with specifications
    
    const examples: ScrapedExample[] = [];
    
    // Extract:
    // - Aperture, focal ratio, type from thread titles
    // - Bill of materials from posts
    // - Build notes from author comments
    
    console.log(`✅ Found ${examples.length} examples from Cloudy Nights`);
    return examples;
  }

  /**
   * Scrape NASA technical documents for optical design principles
   */
  async scrapeNASATechDocs(): Promise<ScrapedConcept[]> {
    console.log('📡 Scraping NASA technical documents...');
    
    // Target:
    // https://ntrs.nasa.gov/ (NASA Technical Reports Server)
    // Search for: "telescope optics", "optical design", "mirror testing"
    
    const concepts: ScrapedConcept[] = [];
    
    // Extract:
    // - Technical concepts from abstracts
    // - Equations from PDFs (requires pdf.js or similar)
    // - Testing procedures from methodology sections
    
    console.log(`✅ Found ${concepts.length} concepts from NASA`);
    return concepts;
  }

  /**
   * Clean and validate scraped data
   */
  validateData(concepts: ScrapedConcept[], equations: ScrapedEquation[], examples: ScrapedExample[]) {
    console.log('🔍 Validating scraped data...');
    
    // Remove duplicates
    const uniqueConcepts = concepts.filter((concept, index, self) => 
      index === self.findIndex(c => c.title === concept.title)
    );
    
    // Validate required fields
    const validConcepts = uniqueConcepts.filter(c => 
      c.title && c.bodyMd && c.category && c.difficulty
    );
    
    // Sanitize markdown (remove scripts, fix formatting)
    validConcepts.forEach(concept => {
      concept.bodyMd = concept.bodyMd
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    });
    
    console.log(`✅ Validated ${validConcepts.length} concepts`);
    return { concepts: validConcepts, equations, examples };
  }

  /**
   * Export data to JSON files
   */
  async exportToJSON(data: { concepts: ScrapedConcept[], equations: ScrapedEquation[], examples: ScrapedExample[] }) {
    console.log('💾 Exporting data to JSON...');
    
    const timestamp = new Date().toISOString().split('T')[0];
    
    const files = {
      concepts: path.join(this.outputDir, `scraped_concepts_${timestamp}.json`),
      equations: path.join(this.outputDir, `scraped_equations_${timestamp}.json`),
      examples: path.join(this.outputDir, `scraped_examples_${timestamp}.json`),
    };
    
    fs.writeFileSync(files.concepts, JSON.stringify(data.concepts, null, 2));
    fs.writeFileSync(files.equations, JSON.stringify(data.equations, null, 2));
    fs.writeFileSync(files.examples, JSON.stringify(data.examples, null, 2));
    
    console.log('✅ Data exported:');
    console.log(`   - Concepts: ${files.concepts}`);
    console.log(`   - Equations: ${files.equations}`);
    console.log(`   - Examples: ${files.examples}`);
  }

  /**
   * Main scraping workflow
   */
  async run() {
    console.log('🚀 Starting Design KB data scraper...\n');
    
    try {
      // Scrape from multiple sources
      const [stellafaneConcepts, wikipediaEquations, cloudyNightsExamples, nasaConcepts] = await Promise.all([
        this.scrapeStellaFane(),
        this.scrapeWikipediaOptics(),
        this.scrapeCloudyNights(),
        this.scrapeNASATechDocs(),
      ]);
      
      // Combine concepts
      const allConcepts = [...stellafaneConcepts, ...nasaConcepts];
      
      // Validate and clean
      const validatedData = this.validateData(allConcepts, wikipediaEquations, cloudyNightsExamples);
      
      // Export
      await this.exportToJSON(validatedData);
      
      console.log('\n✨ Scraping completed successfully!');
      console.log(`   Total concepts: ${validatedData.concepts.length}`);
      console.log(`   Total equations: ${validatedData.equations.length}`);
      console.log(`   Total examples: ${validatedData.examples.length}`);
      
    } catch (error: any) {
      console.error('❌ Scraping failed:', error.message);
      throw error;
    }
  }
}

// Run scraper if called directly
if (require.main === module) {
  const scraper = new DesignDataScraper();
  scraper.run()
    .then(() => {
      console.log('\n✅ Scraper finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Scraper failed:', error);
      process.exit(1);
    });
}

export { DesignDataScraper };

/* 
 * IMPORTANT NOTES FOR PRODUCTION:
 * 
 * 1. Install dependencies:
 *    npm install cheerio axios puppeteer pdf-parse
 * 
 * 2. Respect robots.txt and rate limiting:
 *    - Add delays between requests (500-1000ms)
 *    - Check site's robots.txt before scraping
 *    - Use polite user agent string
 * 
 * 3. Handle errors gracefully:
 *    - Retry failed requests with exponential backoff
 *    - Log failures for manual review
 *    - Don't crash on single source failure
 * 
 * 4. Data quality:
 *    - Manually review first 10-20 items
 *    - Implement automated quality checks
 *    - Flag suspicious content for human review
 * 
 * 5. Legal compliance:
 *    - Ensure scraped content is public domain or CC-licensed
 *    - Attribute sources properly
 *    - Don't scrape paywalled content
 * 
 * 6. Maintenance:
 *    - Re-run scraper monthly for updates
 *    - Monitor for site structure changes
 *    - Update selectors when sites redesign
 */
