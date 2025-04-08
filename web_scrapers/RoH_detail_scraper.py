import pandas as pd
import requests
from bs4 import BeautifulSoup
import re
import time
from datetime import datetime
import os

def scrape_campaign_details():
    """
    Reads the unique campaigns Excel file and scrapes additional details from each campaign page
    """
    # Check if the unique campaigns file exists
    if not os.path.exists('ray_of_hope_campaigns_unique.xlsx'):
        print("Error: Could not find ray_of_hope_campaigns_unique.xlsx")
        if os.path.exists('ray_of_hope_campaigns_unique.csv'):
            print("Found CSV version instead. Using that.")
            unique_campaigns = pd.read_csv('ray_of_hope_campaigns_unique.csv')
        else:
            print("No campaign data found. Please run the main scraper first.")
            return
    else:
        # Load the unique campaigns file
        unique_campaigns = pd.read_excel('ray_of_hope_campaigns_unique.xlsx')
    
    print(f"Loaded {len(unique_campaigns)} unique campaigns. Starting to scrape additional details...")
    
    # Headers for request
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    # Add new columns for the additional details
    unique_campaigns['Start Date'] = None
    unique_campaigns['Number of Donors'] = None
    unique_campaigns['Days Active'] = None  # Calculate days from start to now or end
    
    # Counter for progress reporting
    total = len(unique_campaigns)
    count = 0
    
    # Process each campaign URL
    for index, row in unique_campaigns.iterrows():
        count += 1
        url = row['URL']
        
        if url == "Unknown" or pd.isna(url):
            print(f"Skipping campaign with unknown URL: {row['Title']}")
            continue
        
        print(f"[{count}/{total}] Scraping details for: {row['Title']}")
        
        try:
            # Add a delay to be respectful to the server
            time.sleep(0.1)
            
            # Send GET request to the campaign page
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code != 200:
                print(f"  Error: Failed to retrieve page (Status code: {response.status_code})")
                continue
            
            # Parse the HTML content
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract start date
            start_date_elem = soup.find('div', class_='wpneo-campaign-date')
            if start_date_elem:
                # Extract date string from "Started on DD/MM/YYYY"
                date_match = re.search(r'Started on (\d{2}/\d{2}/\d{4})', start_date_elem.text)
                if date_match:
                    start_date_str = date_match.group(1)
                    unique_campaigns.at[index, 'Start Date'] = start_date_str
                    
                    # Calculate days active
                    try:
                        start_date = datetime.strptime(start_date_str, '%d/%m/%Y')
                        today = datetime.now()
                        days_active = (today - start_date).days
                        unique_campaigns.at[index, 'Days Active'] = days_active
                    except Exception as e:
                        print(f"  Error parsing date: {e}")
            
            # Extract number of donors
            donors_elem = soup.find('span', class_='info-text percentage-completed')
            if donors_elem:
                # Extract number from "From XX Donors"
                donors_match = re.search(r'From (\d+) Donors?', donors_elem.text)
                if donors_match:
                    num_donors = int(donors_match.group(1))
                    unique_campaigns.at[index, 'Number of Donors'] = num_donors
            
            print(f"  Successfully scraped details for {row['Title']}")
            
        except Exception as e:
            print(f"  Error processing {url}: {e}")
    
    # Save the updated data
    try:
        unique_campaigns.to_excel('ray_of_hope_campaigns_detailed.xlsx', index=False)
        print(f"Detailed campaign data saved to ray_of_hope_campaigns_detailed.xlsx")
    except Exception as e:
        print(f"Error saving Excel file: {e}")
        unique_campaigns.to_csv('ray_of_hope_campaigns_detailed.csv', index=False)
        print("Detailed campaign data saved to ray_of_hope_campaigns_detailed.csv instead")
    
    return unique_campaigns

if __name__ == "__main__":
    print("Starting to scrape additional campaign details...")
    campaign_data = scrape_campaign_details()
    print("Scraping completed.")