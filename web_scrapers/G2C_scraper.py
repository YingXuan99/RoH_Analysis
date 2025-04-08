import requests
from bs4 import BeautifulSoup
import pandas as pd
import re
import time
from datetime import datetime
import random
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def setup_requests_session():
    """
    Set up a requests session with retry capability
    """
    session = requests.Session()
    
    # Configure retry strategy
    retries = Retry(
        total=5,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"]
    )
    
    # Mount the adapter with retry strategy to the session
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    return session

def get_browser_headers():
    """
    Return headers that mimic a browser request
    """
    return {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4430.212 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Cache-Control': 'max-age=0'
    }

def scrape_campaign_list(url, session=None, timeout=30):
    """
    Scrape a list of campaign URLs from the main campaigns page
    """
    if session is None:
        session = setup_requests_session()
    
    print(f"Scraping campaign list from: {url}")
    
    try:
        # Send GET request to the website
        response = session.get(url, headers=get_browser_headers(), timeout=timeout)
        
        # Check if request was successful
        if response.status_code != 200:
            print(f"Failed to access the website. Status code: {response.status_code}")
            return []
        
        # Parse the HTML content
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all campaign articles
        campaign_articles = soup.find_all('article', class_='type-campaigns')
        
        if not campaign_articles:
            print(f"No campaign articles found on {url}")
            return []
        
        print(f"Found {len(campaign_articles)} campaigns on this page")
        
        # List to store campaign data
        campaigns_data = []
        
        # Process each campaign article to extract title and URL
        for article in campaign_articles:
            campaign_data = {}
            
            # Extract campaign title
            title_element = article.find(class_='thrive-shortcode-content', attrs={'data-shortcode': 'tcb_post_title'})
            if title_element and title_element.a:
                campaign_data['Campaign Title'] = title_element.a.text.strip()
                campaign_data['URL'] = title_element.a.get('href', '')
            elif title_element:
                campaign_data['Campaign Title'] = title_element.text.strip()
                campaign_data['URL'] = ''
            else:
                # Try alternative method to find title
                title_element = article.find('h2')
                if title_element and title_element.find('a'):
                    campaign_data['Campaign Title'] = title_element.find('a').text.strip()
                    campaign_data['URL'] = title_element.find('a').get('href', '')
                else:
                    # One more attempt with any link in the article
                    links = article.find_all('a')
                    if links:
                        for link in links:
                            if link.text.strip():
                                campaign_data['Campaign Title'] = link.text.strip()
                                campaign_data['URL'] = link.get('href', '')
                                break
                    
                    if 'Campaign Title' not in campaign_data:
                        campaign_data['Campaign Title'] = 'Unknown'
                        campaign_data['URL'] = ''
            
            if campaign_data['URL']:
                campaigns_data.append(campaign_data)
            else:
                print(f"Skipping campaign with no URL: {campaign_data['Campaign Title']}")
        
        return campaigns_data
    
    except requests.exceptions.Timeout as e:
        print(f"Timeout error while accessing {url}: {e}")
        if timeout < 60:
            print("Retrying with increased timeout...")
            return scrape_campaign_list(url, session, timeout + 15)
        return []
    except requests.exceptions.RequestException as e:
        print(f"Request error while accessing {url}: {e}")
        return []
    except Exception as e:
        print(f"An error occurred while processing {url}: {e}")
        return []

def scrape_campaign_details(campaign_url, session=None, timeout=30):
    """
    Scrape detailed information from an individual campaign page
    """
    if session is None:
        session = setup_requests_session()
    
    print(f"Scraping details from: {campaign_url}")
    
    try:
        # Send GET request to the campaign page
        response = session.get(campaign_url, headers=get_browser_headers(), timeout=timeout)
        
        # Check if request was successful
        if response.status_code != 200:
            print(f"Failed to access campaign page. Status code: {response.status_code}")
            return {}
        
        # Parse the HTML content
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Initialize details dictionary
        details = {}
        
        # Extract date range
        class_elements = soup.find_all(class_='tve_shortcode_rendered')
        date_element = class_elements[1]
        if date_element and date_element.p:
            date_text = date_element.p.text.strip()
            date_match = re.search(r'(\d+\s+\w+\s+\d+)\s+–\s+(\d+\s+\w+\s+\d+)', date_text)
            if date_match:
                details['Start Date'] = date_match.group(1)
                details['End Date'] = date_match.group(2)
        
        # Look for progress bar information
        progress_div = soup.find('div', class_='single-page-progressbar')
        if progress_div:
            # Extract percentage
            percentage_element = progress_div.find('span', class_='percentage-text')
            if percentage_element:
                percentage_text = percentage_element.text.strip()
                percentage_match = re.search(r'(\d+\.?\d*)%', percentage_text)
                if percentage_match:
                    details['Percentage Completion'] = float(percentage_match.group(1))
            
            # Extract number of donors
            donors_element = progress_div.find('div', class_='percentage-backers')
            if donors_element and donors_element.span:
                donors_text = donors_element.span.text.strip()
                donors_match = re.search(r'(\d+)', donors_text)
                if donors_match:
                    details['Number of Donors'] = int(donors_match.group(1))
            
            # Extract raised and target amounts
            raised_element = progress_div.find('span', class_='raised-text')
            if raised_element:
                raised_text = raised_element.text.strip()
                amounts_match = re.search(r'\$(\d+(?:,\d+)*(?:\.\d+)?) of \$(\d+(?:,\d+)*(?:\.\d+)?)', raised_text)
                if amounts_match:
                    raised_amount = amounts_match.group(1).replace(',', '')
                    target_amount = amounts_match.group(2).replace(',', '')
                    details['Amount Raised'] = float(raised_amount)
                    details['Target Amount'] = float(target_amount)
            
            # Extract days left
            days_element = progress_div.find('span', class_='days-text')
            if days_element:
                days_text = days_element.text.strip()
                days_match = re.search(r'(\d+) days? left', days_text)
                if days_match:
                    details['Days Left'] = int(days_match.group(1))
                elif 'Campaign has ended' in days_text:
                    details['Days Left'] = 0
        
        return details
    
    except requests.exceptions.Timeout as e:
        print(f"Timeout error while accessing campaign page: {e}")
        if timeout < 60:
            print("Retrying with increased timeout...")
            return scrape_campaign_details(campaign_url, session, timeout + 15)
        return {}
    except requests.exceptions.RequestException as e:
        print(f"Request error while accessing campaign page: {e}")
        return {}
    except Exception as e:
        print(f"An error occurred while processing campaign page: {e}")
        return {}

def scrape_all_campaigns(base_url, max_pages=17):
    """
    Scrape all campaigns from the list pages, then get details from each campaign page
    """
    session = setup_requests_session()
    all_campaigns = []
    
    # First get all campaign URLs from all pages
    print("Phase 1: Collecting all campaign URLs...")
    campaign_urls = []
    
    # Scrape first page
    first_page_campaigns = scrape_campaign_list(base_url, session)
    campaign_urls.extend(first_page_campaigns)
    
    # If first page returned results, try the rest
    if first_page_campaigns:
        # Scrape remaining pages
        for page_num in range(2, max_pages + 1):
            page_url = f"{base_url}page/{page_num}/"
            page_campaigns = scrape_campaign_list(page_url, session)
            
            # If no campaigns found, we might have reached the end
            if not page_campaigns:
                print(f"No campaigns found on page {page_num}, might be the last page")
                break
            
            campaign_urls.extend(page_campaigns)
            
            # Be respectful to the server
            sleep_time = 0.5
            print(f"Waiting {sleep_time:.2f} seconds before next request...")
            time.sleep(sleep_time)
    
    print(f"Total campaigns found: {len(campaign_urls)}")
    
    # Now get details for each campaign
    print("\nPhase 2: Collecting details for each campaign...")
    for i, campaign in enumerate(campaign_urls):
        print(f"Processing campaign {i+1}/{len(campaign_urls)}: {campaign['Campaign Title']}")
        
        if not campaign['URL']:
            print("  No URL available, skipping details extraction")
            all_campaigns.append(campaign)
            continue
        
        # Get campaign details
        details = scrape_campaign_details(campaign['URL'], session)
        
        # Merge campaign basic info with details
        complete_data = {**campaign, **details}
        
        # Add to all campaigns list
        all_campaigns.append(complete_data)
        
        # Be respectful to the server
        if i < len(campaign_urls) - 1:  # No need to wait after the last campaign
            sleep_time = 0.5
            print(f"Waiting {sleep_time:.2f} seconds before next request...")
            time.sleep(sleep_time)
    
    return all_campaigns

def save_to_excel(campaigns, filename="G2C_campaigns.xlsx"):
    """
    Save the campaign data to an Excel file
    """
    if not campaigns:
        print("No campaign data to save")
        return False
    
    # Convert to DataFrame
    df = pd.DataFrame(campaigns)
    
    # Save to Excel
    try:
        df.to_excel(filename, index=False)
        print(f"Data successfully saved to {filename}")
        print(f"Total campaigns scraped: {len(df)}")
        
        # Print a summary of the data
        print("\nData Summary:")
        print(f"- Number of campaigns: {len(df)}")
        
        # Calculate total amount raised
        if 'Amount Raised' in df.columns:
            numeric_amounts = pd.to_numeric(df['Amount Raised'], errors='coerce')
            total_raised = numeric_amounts.sum()
            print(f"- Total amount raised: ${total_raised:,.2f}")
        
        # Show the number of campaigns by percentage completion ranges
        if 'Percentage Completion' in df.columns:
            numeric_pct = pd.to_numeric(df['Percentage Completion'], errors='coerce')
            pct_ranges = [
                (0, 25, 'Less than 25%'),
                (25, 50, '25% to 50%'),
                (50, 75, '50% to 75%'),
                (75, 100, '75% to 100%'),
                (100, float('inf'), 'Over 100%')
            ]
            
            print("- Campaigns by completion percentage:")
            for lower, upper, label in pct_ranges:
                count = ((numeric_pct >= lower) & (numeric_pct < upper)).sum()
                print(f"  {label}: {count}")
        
        return True
    except Exception as e:
        print(f"Error saving to Excel: {e}")
        # Try saving as CSV as fallback
        try:
            csv_filename = filename.replace('.xlsx', '.csv')
            df.to_csv(csv_filename, index=False)
            print(f"Data saved as CSV instead: {csv_filename}")
            return True
        except Exception as csv_e:
            print(f"Error saving as CSV: {csv_e}")
            return False

def main():
    # Base URL of the charity website
    base_url = "https://www.childrensociety.org.sg/g2c/campaigns/"
    
    print("Starting comprehensive charity campaign scraper...")
    
    # Scrape all campaigns from all pages
    all_campaigns = scrape_all_campaigns(base_url)
    
    # Save to Excel
    if all_campaigns:
        save_to_excel(all_campaigns)
    else:
        print("No campaigns were scraped")

if __name__ == "__main__":
    main()